import { useState } from "react";
import { Check, Copy, Pipette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface PremiumColorCardProps {
  color: string;
  label: string;
  onChange: (color: string) => void;
}

export function PremiumColorCard({ color, label, onChange }: PremiumColorCardProps) {
  const [copied, setCopied] = useState(false);

  const copyColor = () => {
    navigator.clipboard.writeText(color);
    setCopied(true);
    toast.success(`Cor ${color} copiada!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col">
      {/* Large Color Swatch - NO text inside */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="w-full h-24 rounded-xl shadow-sm border border-gray-200 
                       transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer
                       focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ backgroundColor: color }}
            aria-label={`Editar cor ${label}`}
          />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="start">
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-900">Escolher cor</p>
            <div className="flex gap-3">
              <Input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="w-14 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
                className="flex-1 uppercase font-mono text-sm"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Info Below - Label, HEX, Copy */}
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm font-mono text-gray-500 uppercase">{color}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={copyColor}
          className="h-8 w-8 text-gray-400 hover:text-gray-600"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
