import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Check } from 'lucide-react';

const ALL_LANGUAGES = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

interface ArticleLanguageSelectorProps {
  currentLanguage: string;
  availableLanguages: string[];
  onLanguageChange: (languageCode: string) => void;
  primaryColor?: string;
}

export const ArticleLanguageSelector = ({
  currentLanguage,
  availableLanguages,
  onLanguageChange,
  primaryColor
}: ArticleLanguageSelectorProps) => {
  const { t } = useTranslation();
  
  // Always include pt-BR as original language
  const languages = ALL_LANGUAGES.filter(
    lang => lang.code === 'pt-BR' || availableLanguages.includes(lang.code)
  );
  
  const currentLang = ALL_LANGUAGES.find(l => l.code === currentLanguage) || ALL_LANGUAGES[0];

  if (languages.length <= 1) {
    return null; // Don't show if only original language available
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          <span className="text-base">{currentLang.flag}</span>
          <span className="hidden sm:inline">{currentLang.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
              {lang.code === 'pt-BR' && (
                <Badge variant="secondary" className="text-xs ml-1">
                  Original
                </Badge>
              )}
            </div>
            {currentLanguage === lang.code && (
              <Check 
                className="h-4 w-4" 
                style={{ color: primaryColor || 'hsl(var(--primary))' }} 
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
