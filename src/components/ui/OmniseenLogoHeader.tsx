import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface OmniseenLogoHeaderProps {
  className?: string;
  variant?: "dark" | "light";
}

export function OmniseenLogoHeader({ className, variant = "dark" }: OmniseenLogoHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#4D148C] to-[#FF6600]">
        <Eye className="w-5 h-5 text-white" />
      </div>
      <span className="text-xl font-bold tracking-tight">
        <span className={variant === "light" ? "text-white" : "text-[#4D148C]"}>Omni</span>
        <span className="text-[#FF6600]">seen</span>
      </span>
    </div>
  );
}
