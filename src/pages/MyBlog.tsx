import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBlog } from "@/hooks/useBlog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ChevronLeft, ExternalLink, Save, Loader2 } from "lucide-react";

import { ObjectiveTab } from "@/components/blog-editor/ObjectiveTab";
import { CategoriesManager } from "@/components/blog-editor/CategoriesManager";
import { DesignTab } from "@/components/blog-editor/DesignTab";
import { DomainTab } from "@/components/blog-editor/DomainTab";
import { ScriptsIntegrationsTab } from "@/components/blog-editor/ScriptsIntegrationsTab";
import { CMSIntegrationsTab } from "@/components/blog-editor/CMSIntegrationsTab";
import { BlogEditorPreview } from "@/components/blog-editor/BlogEditorPreview";
import { ColorPalette } from "@/components/blog-editor/ColorPaletteModal";
import { getBlogUrl } from "@/utils/blogUrl";
import { Json } from "@/integrations/supabase/types";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

interface TrackingConfig {
  ga_id?: string;
  gtm_id?: string;
  meta_pixel_id?: string;
  google_ads_id?: string;
}

const MyBlog = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { blog, loading: blogLoading, refetch } = useBlog();
  
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [ctaType, setCtaType] = useState("link");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerDescription, setBannerDescription] = useState("");
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerMobileImageUrl, setBannerMobileImageUrl] = useState("");
  const [bannerLinkUrl, setBannerLinkUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoNegativeUrl, setLogoNegativeUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [domainVerified, setDomainVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [scriptHead, setScriptHead] = useState("");
  const [scriptBody, setScriptBody] = useState("");
  const [scriptFooter, setScriptFooter] = useState("");
  const [trackingConfig, setTrackingConfig] = useState<TrackingConfig>({});
  const [brandDescription, setBrandDescription] = useState("");

  // Load blog data into form
  useEffect(() => {
    if (blog) {
      setCtaType(blog.cta_type || "link");
      setCtaText(blog.cta_text || "");
      setCtaUrl(blog.cta_url || "");
      setBannerTitle(blog.banner_title || "");
      setBannerDescription(blog.banner_description || "");
      setBannerEnabled(blog.banner_enabled ?? true);
      setBannerImageUrl(blog.banner_image_url || "");
      setBannerMobileImageUrl(blog.banner_mobile_image_url || "");
      setBannerLinkUrl(blog.banner_link_url || "");
      setPrimaryColor(blog.primary_color || "");
      setSecondaryColor(blog.secondary_color || "");
      setColorPalette((blog.color_palette as unknown as ColorPalette) || null);
      setLogoUrl(blog.logo_url || "");
      setLogoNegativeUrl(blog.logo_negative_url || "");
      setFaviconUrl(blog.favicon_url || "");
      setCustomDomain(blog.custom_domain || "");
      setDomainVerified(blog.domain_verified || false);
      setVerificationToken(blog.domain_verification_token || "");
      setScriptHead(blog.script_head || "");
      setScriptBody(blog.script_body || "");
      setScriptFooter(blog.script_footer || "");
      setTrackingConfig((blog.tracking_config as TrackingConfig) || {});
      setBrandDescription(blog.brand_description || "");
    }
  }, [blog]);

  // Mark as changed when form values update
  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  // Wrapper functions to mark changes
  const updateCtaType = (v: string) => { setCtaType(v); markChanged(); };
  const updateCtaText = (v: string) => { setCtaText(v); markChanged(); };
  const updateCtaUrl = (v: string) => { setCtaUrl(v); markChanged(); };
  const updateWhatsappMessage = (v: string) => { setWhatsappMessage(v); markChanged(); };
  const updateBannerTitle = (v: string) => { setBannerTitle(v); markChanged(); };
  const updateBannerDescription = (v: string) => { setBannerDescription(v); markChanged(); };
  const updateBannerEnabled = (v: boolean) => { setBannerEnabled(v); markChanged(); };
  const updateBannerImageUrl = (v: string) => { setBannerImageUrl(v); markChanged(); };
  const updateBannerMobileImageUrl = (v: string) => { setBannerMobileImageUrl(v); markChanged(); };
  const updateBannerLinkUrl = (v: string) => { setBannerLinkUrl(v); markChanged(); };
  const updatePrimaryColor = (v: string) => { setPrimaryColor(v); markChanged(); };
  const updateSecondaryColor = (v: string) => { setSecondaryColor(v); markChanged(); };
  const updateColorPalette = (v: ColorPalette) => { setColorPalette(v); markChanged(); };
  const updateLogoUrl = (v: string) => { setLogoUrl(v); markChanged(); };
  const updateLogoNegativeUrl = (v: string) => { setLogoNegativeUrl(v); markChanged(); };
  const updateFaviconUrl = (v: string) => { setFaviconUrl(v); markChanged(); };
  const updateScriptHead = (v: string) => { setScriptHead(v); markChanged(); };
  const updateScriptBody = (v: string) => { setScriptBody(v); markChanged(); };
  const updateScriptFooter = (v: string) => { setScriptFooter(v); markChanged(); };
  const updateTrackingConfig = (v: TrackingConfig) => { setTrackingConfig(v); markChanged(); };
  const updateBrandDescription = (v: string) => { setBrandDescription(v); markChanged(); };

  const handleSave = async () => {
    if (!blog) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("blogs")
        .update({
          cta_type: ctaType,
          cta_text: ctaText || null,
          cta_url: ctaUrl || null,
          banner_title: bannerTitle || null,
          banner_description: bannerDescription || null,
          banner_enabled: bannerEnabled,
          banner_image_url: bannerImageUrl || null,
          banner_mobile_image_url: bannerMobileImageUrl || null,
          banner_link_url: bannerLinkUrl || null,
          primary_color: primaryColor || null,
          secondary_color: secondaryColor || null,
          color_palette: colorPalette as unknown as Json,
          logo_url: logoUrl || null,
          logo_negative_url: logoNegativeUrl || null,
          favicon_url: faviconUrl || null,
          script_head: scriptHead || null,
          script_body: scriptBody || null,
          script_footer: scriptFooter || null,
          tracking_config: trackingConfig as unknown as Json,
          brand_description: brandDescription || null,
        })
        .eq("id", blog.id);

      if (error) throw error;

      setHasChanges(false);
      toast.success("Alterações salvas com sucesso!");
      refetch();
    } catch (error) {
      console.error("Error saving blog:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBlog = () => {
    if (!blog) return;
    const url = getBlogUrl(blog);
    window.open(url, "_blank");
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || blogLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-12 w-48 mb-6" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Blog não encontrado</h1>
          <p className="text-muted-foreground mb-4">
            Você precisa criar um blog primeiro.
          </p>
          <Button onClick={() => navigate("/onboarding")}>
            Criar Blog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Sair do Editor
          </Button>
          <h1 className="font-semibold text-lg hidden sm:block">Editor do Blog</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenBlog}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Abrir Blog</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Salvar</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Form Panel */}
        <div className="lg:w-1/2 xl:w-[45%] border-r overflow-y-auto">
          <div className="p-6">
            <Tabs defaultValue="objective" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="objective">Objetivo</TabsTrigger>
                <TabsTrigger value="categories">Categorias</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="domain">Domínio</TabsTrigger>
                <TabsTrigger value="cms">CMS</TabsTrigger>
                <TabsTrigger value="scripts">Scripts</TabsTrigger>
              </TabsList>

              <TabsContent value="objective">
                <ObjectiveTab
                  ctaType={ctaType}
                  ctaText={ctaText}
                  ctaUrl={ctaUrl}
                  whatsappMessage={whatsappMessage}
                  bannerTitle={bannerTitle}
                  bannerDescription={bannerDescription}
                  bannerEnabled={bannerEnabled}
                  bannerImageUrl={bannerImageUrl}
                  bannerMobileImageUrl={bannerMobileImageUrl}
                  bannerLinkUrl={bannerLinkUrl}
                  blogId={blog.id}
                  userId={user?.id || ""}
                  logoUrl={logoUrl}
                  onLogoUrlChange={updateLogoUrl}
                  onCtaTypeChange={updateCtaType}
                  onCtaTextChange={updateCtaText}
                  onCtaUrlChange={updateCtaUrl}
                  onWhatsappMessageChange={updateWhatsappMessage}
                  onBannerTitleChange={updateBannerTitle}
                  onBannerDescriptionChange={updateBannerDescription}
                  onBannerEnabledChange={updateBannerEnabled}
                  onBannerImageUrlChange={updateBannerImageUrl}
                  onBannerMobileImageUrlChange={updateBannerMobileImageUrl}
                  onBannerLinkUrlChange={updateBannerLinkUrl}
                />
              </TabsContent>

              <TabsContent value="categories">
                <CategoriesManager
                  blogId={blog.id}
                  onCategoriesChange={setCategories}
                />
              </TabsContent>

              <TabsContent value="design">
                <DesignTab
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  colorPalette={colorPalette}
                  logoUrl={logoUrl}
                  logoNegativeUrl={logoNegativeUrl}
                  faviconUrl={faviconUrl}
                  userId={user?.id || ""}
                  blogId={blog.id}
                  onPrimaryColorChange={updatePrimaryColor}
                  onSecondaryColorChange={updateSecondaryColor}
                  onColorPaletteChange={updateColorPalette}
                  onLogoUrlChange={updateLogoUrl}
                  onLogoNegativeUrlChange={updateLogoNegativeUrl}
                  onFaviconUrlChange={updateFaviconUrl}
                />
              </TabsContent>

              <TabsContent value="domain">
                <DomainTab
                  blogId={blog.id}
                  blogSlug={blog.slug}
                  customDomain={customDomain}
                  domainVerified={domainVerified}
                  verificationToken={verificationToken}
                  onCustomDomainChange={setCustomDomain}
                  onDomainVerifiedChange={setDomainVerified}
                  onVerificationTokenChange={setVerificationToken}
                />
              </TabsContent>

              <TabsContent value="cms">
                <CMSIntegrationsTab blogId={blog.id} />
              </TabsContent>

              <TabsContent value="scripts">
                <ScriptsIntegrationsTab
                  blogId={blog.id}
                  scriptHead={scriptHead}
                  scriptBody={scriptBody}
                  scriptFooter={scriptFooter}
                  trackingConfig={trackingConfig}
                  onScriptHeadChange={updateScriptHead}
                  onScriptBodyChange={updateScriptBody}
                  onScriptFooterChange={updateScriptFooter}
                  onTrackingConfigChange={updateTrackingConfig}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:w-1/2 xl:w-[55%] bg-muted/30 hidden lg:block">
          <BlogEditorPreview
            blogId={blog.id}
            blogName={blog.name}
            blogDescription={blog.description || ""}
            logoUrl={logoUrl}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            colorPalette={colorPalette}
            categories={categories}
            ctaText={ctaText}
            ctaType={ctaType}
            bannerTitle={bannerTitle}
            bannerDescription={bannerDescription}
            bannerEnabled={bannerEnabled}
            brandDescription={brandDescription}
          />
        </div>
      </div>
    </div>
  );
};

export default MyBlog;
