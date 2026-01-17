import { useState, useEffect } from "react";
import { Facebook, Twitter, Linkedin, MessageCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FloatingShareBarProps {
  url: string;
  title: string;
  description?: string;
  articleId: string;
  blogId: string;
  primaryColor?: string;
}

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

export const FloatingShareBar = ({
  url,
  title,
  description,
  articleId,
  blogId,
  primaryColor,
}: FloatingShareBarProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const trackShare = async (platform: string) => {
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-analytics`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "share",
            articleId,
            blogId,
            sessionId: getSessionId(),
            data: { sharePlatform: platform },
          }),
        }
      );
    } catch (err) {
      console.error("Failed to track share:", err);
    }
  };

  const handleShare = (platform: string) => {
    trackShare(platform);

    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(`${title} ${url}`);

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`📰 ${title}\n\nLeia o artigo completo:\n${url}`)}`,
    };

    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!", {
        description: "O link do artigo foi copiado para a área de transferência.",
      });
    } else {
      window.open(shareUrls[platform], "_blank", "width=600,height=400");
    }
  };

  const buttonStyle = primaryColor
    ? { "--hover-color": primaryColor } as React.CSSProperties
    : {};

  const shareButtons = [
    { platform: "facebook", icon: Facebook, label: "Facebook" },
    { platform: "twitter", icon: Twitter, label: "Twitter" },
    { platform: "linkedin", icon: Linkedin, label: "LinkedIn" },
    { platform: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
    { platform: "copy", icon: Link2, label: "Copiar" },
  ];

  return (
    <>
      {/* Desktop - Fixed left sidebar */}
      <div
        className={cn(
          "fixed left-4 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-2 transition-all duration-300",
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full"
        )}
      >
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-2 shadow-lg">
          {shareButtons.map(({ platform, icon: Icon, label }) => (
            <Button
              key={platform}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
              style={buttonStyle}
              onClick={() => handleShare(platform)}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile - Fixed bottom bar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-all duration-300",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3 shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Compartilhar:</span>
            {shareButtons.map(({ platform, icon: Icon, label }) => (
              <Button
                key={platform}
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                style={buttonStyle}
                onClick={() => handleShare(platform)}
                title={label}
              >
                <Icon className="h-5 w-5" />
              </Button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
