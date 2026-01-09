import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface BlogTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
}

export const BLOG_THEMES: BlogTheme[] = [
  { id: "indigo", name: "Índigo", primaryColor: "#6366f1", secondaryColor: "#8b5cf6" },
  { id: "ocean", name: "Oceano", primaryColor: "#0ea5e9", secondaryColor: "#06b6d4" },
  { id: "emerald", name: "Esmeralda", primaryColor: "#10b981", secondaryColor: "#14b8a6" },
  { id: "sunset", name: "Pôr do Sol", primaryColor: "#f97316", secondaryColor: "#f59e0b" },
  { id: "rose", name: "Rosa", primaryColor: "#f43f5e", secondaryColor: "#ec4899" },
  { id: "slate", name: "Ardósia", primaryColor: "#475569", secondaryColor: "#64748b" },
  { id: "royal", name: "Real", primaryColor: "#7c3aed", secondaryColor: "#a855f7" },
  { id: "forest", name: "Floresta", primaryColor: "#059669", secondaryColor: "#84cc16" },
];

interface ThemeSelectorProps {
  currentPrimary: string;
  currentSecondary: string;
  onSelectTheme: (theme: BlogTheme) => void;
  loading?: boolean;
}

export function ThemeSelector({ 
  currentPrimary, 
  currentSecondary, 
  onSelectTheme,
  loading 
}: ThemeSelectorProps) {
  const isSelected = (theme: BlogTheme) => 
    theme.primaryColor.toLowerCase() === currentPrimary.toLowerCase() &&
    theme.secondaryColor.toLowerCase() === currentSecondary.toLowerCase();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display">Temas do Blog</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {BLOG_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onSelectTheme(theme)}
              disabled={loading}
              className={cn(
                "group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                isSelected(theme) 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50 hover:bg-muted/50",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Color Preview */}
              <div className="flex gap-1">
                <div 
                  className="h-8 w-8 rounded-full shadow-sm"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                <div 
                  className="h-8 w-8 rounded-full shadow-sm -ml-3"
                  style={{ backgroundColor: theme.secondaryColor }}
                />
              </div>
              
              {/* Theme Name */}
              <span className="text-xs font-medium text-foreground">
                {theme.name}
              </span>

              {/* Selected Indicator */}
              {isSelected(theme) && (
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
