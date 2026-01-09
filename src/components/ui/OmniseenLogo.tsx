import logoOmniseen from "@/assets/logo-omniseen.png";
import { cn } from "@/lib/utils";

interface OmniseenLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
};

export function OmniseenLogo({ size = 'md', className }: OmniseenLogoProps) {
  return (
    <img 
      src={logoOmniseen} 
      alt="OMNISEEN" 
      className={cn(sizeClasses[size], "w-auto object-contain", className)}
    />
  );
}
