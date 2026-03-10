import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Globe,
  BarChart3,
  Share2,
  Webhook,
  Search,
  LineChart,
  Tag,
  Target,
  Music,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBlog } from "@/hooks/useBlog";
import { IntegrationCard, IntegrationStatus } from "@/components/integrations/IntegrationCard";
import { IntegrationSection } from "@/components/integrations/IntegrationSection";
import { SocialConnectionsSection } from "@/components/integrations/SocialConnectionsSection";

interface TrackingConfig {
  ga_id?: string;
  gtm_id?: string;
  meta_pixel_id?: string;
  google_ads_id?: string;
}

export default function Integrations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { blog, loading: blogLoading } = useBlog();

  const [cmsStatus, setCmsStatus] = useState<{ wordpress: IntegrationStatus; wix: IntegrationStatus }>({
    wordpress: "inactive",
    wix: "inactive",
  });
  const [gscStatus, setGscStatus] = useState<IntegrationStatus>("inactive");
  const [trackingStatus, setTrackingStatus] = useState<{
    ga: IntegrationStatus;
    gtm: IntegrationStatus;
    meta: IntegrationStatus;
    googleAds: IntegrationStatus;
  }>({
    ga: "inactive",
    gtm: "inactive",
    meta: "inactive",
    googleAds: "inactive",
  });

  useEffect(() => {
    if (!blog?.id) return;

    const fetchStatuses = async () => {
      // Fetch CMS integrations
      const { data: cmsData } = await supabase
        .from("cms_integrations")
        .select("platform, is_active")
        .eq("blog_id", blog.id);

      if (cmsData) {
        const wordpress = cmsData.find((c) => c.platform === "wordpress" && c.is_active);
        const wix = cmsData.find((c) => c.platform === "wix" && c.is_active);
        setCmsStatus({
          wordpress: wordpress ? "active" : "inactive",
          wix: wix ? "active" : "inactive",
        });
      }

      // Fetch GSC connection
      const { data: gscData } = await supabase
        .from("gsc_connections")
        .select("id")
        .eq("blog_id", blog.id)
        .eq("is_active", true)
        .maybeSingle();

      setGscStatus(gscData ? "active" : "inactive");

      // Check tracking config from blog
      const trackingConfig = (blog.tracking_config as TrackingConfig) || {};
      setTrackingStatus({
        ga: trackingConfig.ga_id ? "active" : "inactive",
        gtm: trackingConfig.gtm_id ? "active" : "inactive",
        meta: trackingConfig.meta_pixel_id ? "active" : "inactive",
        googleAds: trackingConfig.google_ads_id ? "active" : "inactive",
      });
    };

    fetchStatuses();
  }, [blog?.id, blog?.tracking_config]);

  const navigateToCMS = () => navigate("/app/my-blog?tab=cms");
  const navigateToScripts = () => navigate("/app/my-blog?tab=scripts");
  const navigateToArticles = () => navigate("/app/articles");
  const navigateToNewArticle = () => navigate("/app/articles/new");

  if (blogLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("integrations.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("integrations.subtitle")}</p>
      </div>

      {/* Blog Platforms */}
      <IntegrationSection
        title={t("integrations.categories.blog")}
        description={t("integrations.categories.blogDescription")}
        icon={<Globe className="h-5 w-5" />}
      >
        <IntegrationCard
          name={t("integrations.items.wordpress.name")}
          description={t("integrations.items.wordpress.description")}
          icon={Globe}
          iconBgColor="bg-blue-600"
          status={cmsStatus.wordpress}
          onAction={navigateToCMS}
        />
        <IntegrationCard
          name={t("integrations.items.wix.name")}
          description={t("integrations.items.wix.description")}
          icon={Globe}
          iconBgColor="bg-yellow-500"
          iconColor="text-black"
          status={cmsStatus.wix}
          onAction={navigateToCMS}
        />
        <IntegrationCard
          name={t("integrations.items.webhook.name")}
          description={t("integrations.items.webhook.description")}
          icon={Webhook}
          iconBgColor="bg-gray-600"
          status="coming_soon"
        />
      </IntegrationSection>

      {/* Monitoring & Marketing */}
      <IntegrationSection
        title={t("integrations.categories.monitoring")}
        description={t("integrations.categories.monitoringDescription")}
        icon={<BarChart3 className="h-5 w-5" />}
      >
        <IntegrationCard
          name={t("integrations.items.gsc.name")}
          description={t("integrations.items.gsc.description")}
          icon={Search}
          iconBgColor="bg-green-600"
          status={gscStatus}
          onAction={navigateToScripts}
        />
        <IntegrationCard
          name={t("integrations.items.ga.name")}
          description={t("integrations.items.ga.description")}
          icon={LineChart}
          iconBgColor="bg-orange-500"
          status={trackingStatus.ga}
          onAction={navigateToScripts}
        />
        <IntegrationCard
          name={t("integrations.items.gtm.name")}
          description={t("integrations.items.gtm.description")}
          icon={Tag}
          iconBgColor="bg-blue-500"
          status={trackingStatus.gtm}
          onAction={navigateToScripts}
        />
        <IntegrationCard
          name={t("integrations.items.meta.name")}
          description={t("integrations.items.meta.description")}
          icon={Target}
          iconBgColor="bg-blue-700"
          status={trackingStatus.meta}
          onAction={navigateToScripts}
        />
        <IntegrationCard
          name={t("integrations.items.googleAds.name")}
          description={t("integrations.items.googleAds.description")}
          icon={Target}
          iconBgColor="bg-yellow-600"
          status={trackingStatus.googleAds}
          onAction={navigateToScripts}
        />
      </IntegrationSection>

      {/* Content Distribution — Real OAuth Connections */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="text-primary"><Share2 className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("integrations.categories.distribution")}</h2>
            <p className="text-sm text-muted-foreground">{t("integrations.categories.distributionDescription")}</p>
          </div>
        </div>

        {/* OAuth social connections — full width */}
        {blog?.id ? (
          <SocialConnectionsSection blogId={blog.id} />
        ) : (
          <p className="text-sm text-muted-foreground">Selecione um blog para gerenciar conexões.</p>
        )}

        {/* Other distribution tools — grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IntegrationCard
            name={t("integrations.items.soundcloud.name")}
            description={t("integrations.items.soundcloud.description")}
            icon={Music}
            iconBgColor="bg-orange-600"
            status="coming_soon"
          />
        </div>
      </section>
    </div>
  );
}
