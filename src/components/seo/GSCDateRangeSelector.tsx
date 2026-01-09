import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface GSCDateRangeSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

const DATE_RANGES = [
  { days: 7, label: "7 dias" },
  { days: 28, label: "28 dias" },
  { days: 90, label: "90 dias" },
];

export function GSCDateRangeSelector({ value, onChange }: GSCDateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {DATE_RANGES.map((range) => (
          <Button
            key={range.days}
            variant={value === range.days ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3"
            onClick={() => onChange(range.days)}
          >
            {range.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
