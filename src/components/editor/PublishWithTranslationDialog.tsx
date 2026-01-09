import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Globe, Check } from "lucide-react";

const TRANSLATION_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
];

const STORAGE_KEY = "translation-preferences";

interface PublishWithTranslationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (translateLanguages: string[]) => void;
  isPublishing: boolean;
  existingTranslations?: string[];
}

export function PublishWithTranslationDialog({
  open,
  onOpenChange,
  onPublish,
  isPublishing,
  existingTranslations = [],
}: PublishWithTranslationDialogProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [rememberPreferences, setRememberPreferences] = useState(false);

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setSelectedLanguages(prefs.languages || []);
        setRememberPreferences(prefs.remember || false);
      } catch {
        // Ignore parse errors
      }
    }
  }, [open]);

  const handleLanguageToggle = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  const handlePublish = (withTranslation: boolean) => {
    if (rememberPreferences && withTranslation) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          languages: selectedLanguages,
          remember: true,
        })
      );
    } else if (rememberPreferences && !withTranslation) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          languages: [],
          remember: true,
        })
      );
    }

    onPublish(withTranslation ? selectedLanguages : []);
  };

  const availableLanguages = TRANSLATION_LANGUAGES.filter(
    (lang) => !existingTranslations.includes(lang.code)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Publicar Artigo
          </DialogTitle>
          <DialogDescription>
            Escolha os idiomas para traduzir automaticamente o artigo ao publicar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {existingTranslations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Já traduzido
              </Label>
              <div className="flex flex-wrap gap-2">
                {TRANSLATION_LANGUAGES.filter((lang) =>
                  existingTranslations.includes(lang.code)
                ).map((lang) => (
                  <Badge
                    key={lang.code}
                    variant="secondary"
                    className="gap-1 bg-green-500/10 text-green-700 border-green-200"
                  >
                    <Check className="h-3 w-3" />
                    {lang.flag} {lang.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {availableLanguages.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Traduzir para
              </Label>
              {availableLanguages.map((lang) => (
                <div
                  key={lang.code}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleLanguageToggle(lang.code)}
                >
                  <Checkbox
                    id={lang.code}
                    checked={selectedLanguages.includes(lang.code)}
                    onCheckedChange={() => handleLanguageToggle(lang.code)}
                  />
                  <Label
                    htmlFor={lang.code}
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Todas as traduções já foram feitas! 🎉
            </div>
          )}

          <div
            className="flex items-center space-x-2 pt-2 border-t"
            onClick={() => setRememberPreferences(!rememberPreferences)}
          >
            <Checkbox
              id="remember"
              checked={rememberPreferences}
              onCheckedChange={(checked) =>
                setRememberPreferences(checked as boolean)
              }
            />
            <Label
              htmlFor="remember"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Lembrar minhas preferências
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handlePublish(false)}
            disabled={isPublishing}
            className="sm:flex-1"
          >
            Publicar sem traduzir
          </Button>
          <Button
            onClick={() => handlePublish(true)}
            disabled={isPublishing || selectedLanguages.length === 0}
            className="sm:flex-1 gradient-primary"
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {selectedLanguages.length > 0
                  ? `Traduzir (${selectedLanguages.length}) e Publicar`
                  : "Selecione idiomas"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
