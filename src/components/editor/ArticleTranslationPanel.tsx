import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Globe, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useArticleTranslations, SUPPORTED_LANGUAGES } from '@/hooks/useArticleTranslations';
import { format } from 'date-fns';

interface ArticleTranslationPanelProps {
  articleId: string | undefined;
  isDisabled?: boolean;
}

export const ArticleTranslationPanel = ({ articleId, isDisabled }: ArticleTranslationPanelProps) => {
  const { t } = useTranslation();
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  
  const {
    translations,
    isLoading,
    translateMutation,
    isLanguageTranslated,
    isLanguageTranslating,
    translatingLanguages
  } = useArticleTranslations(articleId);

  const handleLanguageToggle = (langCode: string) => {
    setSelectedLanguages(prev => 
      prev.includes(langCode) 
        ? prev.filter(l => l !== langCode)
        : [...prev, langCode]
    );
  };

  const handleTranslate = () => {
    if (selectedLanguages.length === 0) return;
    translateMutation.mutate(selectedLanguages);
    setSelectedLanguages([]);
  };

  const getTranslationDate = (langCode: string) => {
    const translation = translations?.find(t => t.language_code === langCode);
    if (translation?.translated_at) {
      return format(new Date(translation.translated_at), 'dd/MM');
    }
    return null;
  };

  const isTranslating = translatingLanguages.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('translations.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isTranslated = isLanguageTranslated(lang.code);
                const isCurrentlyTranslating = isLanguageTranslating(lang.code);
                const translationDate = getTranslationDate(lang.code);

                return (
                  <div 
                    key={lang.code}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`lang-${lang.code}`}
                        checked={selectedLanguages.includes(lang.code)}
                        onCheckedChange={() => handleLanguageToggle(lang.code)}
                        disabled={isDisabled || isTranslating || !articleId}
                      />
                      <label 
                        htmlFor={`lang-${lang.code}`}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {isCurrentlyTranslating ? (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {t('translations.translating')}
                        </Badge>
                      ) : isTranslated ? (
                        <Badge variant="default" className="text-xs flex items-center gap-1 bg-green-600">
                          <Check className="h-3 w-3" />
                          {translationDate}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {t('translations.notTranslated')}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={handleTranslate}
              disabled={selectedLanguages.length === 0 || isDisabled || isTranslating || !articleId}
              className="w-full"
              size="sm"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('translations.translating')}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('translations.translateSelected')}
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
