import { useNavigate } from "react-router-dom";
import { 
  PenSquare, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Target, 
  Zap, 
  Settings, 
  HelpCircle,
  ShieldCheck
} from "lucide-react";

interface DashboardQuickGridProps {
  blogSlug?: string;
  isPlatformAdmin?: boolean;
}

const gridItems = [
  { icon: PenSquare, label: "Novo Artigo", route: "/app/articles/new", color: "bg-primary/10 text-primary" },
  { icon: FileText, label: "Conteúdos", route: "/app/articles", color: "bg-secondary/80 text-secondary-foreground" },
  { icon: Calendar, label: "Calendário", route: "/app/calendar", color: "bg-accent text-accent-foreground" },
  { icon: TrendingUp, label: "Desempenho", route: "/app/performance", color: "bg-primary/10 text-primary" },
  { icon: Target, label: "Estratégia", route: "/app/strategy", color: "bg-secondary/80 text-secondary-foreground" },
  { icon: Zap, label: "Automações", route: "/app/automation-settings", color: "bg-accent text-accent-foreground" },
  { icon: Settings, label: "Configurações", route: "/app/settings", color: "bg-muted text-muted-foreground" },
  { icon: HelpCircle, label: "Ajuda", route: "/app/help", color: "bg-muted text-muted-foreground" },
];

const adminItem = { 
  icon: ShieldCheck, 
  label: "Admin", 
  route: "/app/admin", 
  color: "bg-destructive/10 text-destructive" 
};

export function DashboardQuickGrid({ isPlatformAdmin }: DashboardQuickGridProps) {
  const navigate = useNavigate();

  const items = isPlatformAdmin ? [...gridItems, adminItem] : gridItems;

  return (
    <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-9 gap-2 md:gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.route}
            onClick={() => navigate(item.route)}
            className="flex flex-col items-center justify-center gap-1.5 p-3 md:p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/30 transition-colors group"
          >
            <div className={`p-2 md:p-2.5 rounded-lg ${item.color} transition-transform group-hover:scale-110`}>
              <Icon className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <span className="text-[10px] md:text-xs font-medium text-center leading-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
