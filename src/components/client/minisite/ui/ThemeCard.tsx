import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeCardProps {
  id: string;
  name: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  preview?: React.ReactNode;
}

export function ThemeCard({ id, name, description, selected, onClick, preview }: ThemeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border-2 text-left transition-all duration-200 group bg-white",
        selected
          ? "border-primary shadow-lg shadow-primary/10"
          : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
      )}
    >
      {/* Preview */}
      {preview && (
        <div className="mb-3 rounded-lg overflow-hidden bg-gray-100 aspect-video">
          {preview}
        </div>
      )}

      <div className="font-semibold text-gray-900">{name}</div>
      <div className="text-sm text-gray-500 mt-1">{description}</div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}
