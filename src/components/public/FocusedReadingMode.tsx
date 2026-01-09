import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Book, X } from "lucide-react";

interface FocusedReadingModeProps {
  isActive: boolean;
  onToggle: () => void;
  primaryColor?: string;
}

export const FocusedReadingMode = ({ isActive, onToggle, primaryColor }: FocusedReadingModeProps) => {
  // Handle ESC key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isActive) {
        onToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onToggle]);

  // Toggle body class for global styling
  useEffect(() => {
    if (isActive) {
      document.body.classList.add("focused-reading-active");
    } else {
      document.body.classList.remove("focused-reading-active");
    }
    return () => document.body.classList.remove("focused-reading-active");
  }, [isActive]);

  if (isActive) {
    return (
      <Button
        onClick={onToggle}
        variant="ghost"
        size="sm"
        className="fixed top-4 right-4 z-[100] bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
      >
        <X className="h-4 w-4 mr-2" />
        Sair do Modo Foco
      </Button>
    );
  }

  return (
    <Button
      onClick={onToggle}
      size="sm"
      variant="outline"
      className="fixed bottom-24 right-4 z-50 shadow-lg backdrop-blur-sm border-border/50 bg-background/80 hover:bg-background"
      style={{
        borderColor: primaryColor ? `${primaryColor}40` : undefined,
      }}
    >
      <Book className="h-4 w-4 mr-2" style={{ color: primaryColor }} />
      Modo Foco
    </Button>
  );
};
