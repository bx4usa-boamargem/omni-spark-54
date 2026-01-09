import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AnnouncementBar() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const couponCode = "OMNISEEN25";

  const handleCopy = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground py-2 px-4 text-center text-sm animate-pulse-slow">
      <div className="container flex items-center justify-center gap-2 flex-wrap">
        <Sparkles className="h-4 w-4" />
        <span className="font-medium">
          {t('landing.announcement.text', '🎉 Get 25% OFF your first year!')}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all",
            "bg-primary-foreground/20 hover:bg-primary-foreground/30 border border-primary-foreground/30"
          )}
        >
          <span className="font-mono">{couponCode}</span>
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
        <span className="hidden sm:inline text-primary-foreground/80">
          {t('landing.announcement.expires', 'Limited time offer')}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
        onClick={() => setIsVisible(false)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
