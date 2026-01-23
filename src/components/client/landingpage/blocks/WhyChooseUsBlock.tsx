import { 
  Shield, 
  Award, 
  Clock, 
  Users, 
  Wrench, 
  Star, 
  ThumbsUp, 
  CheckCircle,
  Zap,
  Heart,
  Target,
  Banknote
} from "lucide-react";
import { WhyChooseUsItem } from "../types/landingPageTypes";

interface WhyChooseUsBlockProps {
  items: WhyChooseUsItem[];
  primaryColor?: string;
  onEdit?: (index: number, field: keyof WhyChooseUsItem, value: string) => void;
  isEditing?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  award: Award,
  clock: Clock,
  users: Users,
  wrench: Wrench,
  star: Star,
  thumbsup: ThumbsUp,
  check: CheckCircle,
  zap: Zap,
  heart: Heart,
  target: Target,
  banknote: Banknote,
};

function getIcon(iconName: string) {
  const Icon = ICON_MAP[iconName?.toLowerCase()] || CheckCircle;
  return Icon;
}

export function WhyChooseUsBlock({ 
  items,
  primaryColor,
  onEdit,
  isEditing = false 
}: WhyChooseUsBlockProps) {
  return (
    <section className="py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Por Que Nos Escolher?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Diferenciais que fazem de nós a melhor escolha para você
          </p>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => {
            const Icon = getIcon(item.icon);
            
            return (
              <div 
                key={item.id || index}
                className="text-center p-6 rounded-xl bg-card border border-border hover:shadow-lg hover:border-primary/30 transition-all group"
              >
                {/* Icon */}
                <div 
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}
                >
                  <Icon 
                    className="w-8 h-8" 
                    style={{ color: primaryColor || 'hsl(var(--primary))' }}
                  />
                </div>

                {/* Title */}
                {isEditing ? (
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => onEdit?.(index, 'title', e.target.value)}
                    className="text-lg font-semibold text-foreground mb-2 bg-transparent border-b border-muted w-full text-center focus:outline-none focus:border-primary"
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>
                )}

                {/* Description */}
                {isEditing ? (
                  <textarea
                    value={item.description}
                    onChange={(e) => onEdit?.(index, 'description', e.target.value)}
                    className="text-sm text-muted-foreground bg-transparent border border-muted rounded p-2 w-full resize-none text-center focus:outline-none focus:border-primary"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
