import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, Calendar as CalendarIconFull } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SchedulePublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (scheduledAt: Date) => void;
  isScheduling?: boolean;
  currentSchedule?: Date | null;
}

export function SchedulePublishDialog({
  open,
  onOpenChange,
  onSchedule,
  isScheduling = false,
  currentSchedule,
}: SchedulePublishDialogProps) {
  const [date, setDate] = useState<Date | undefined>(currentSchedule || undefined);
  const [hour, setHour] = useState<string>(
    currentSchedule ? format(currentSchedule, "HH") : "09"
  );
  const [minute, setMinute] = useState<string>(
    currentSchedule ? format(currentSchedule, "mm") : "00"
  );

  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, "0")
  );
  const minutes = ["00", "15", "30", "45"];

  const handleSchedule = () => {
    if (!date) return;
    
    const scheduledDate = new Date(date);
    scheduledDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
    onSchedule(scheduledDate);
  };

  const isValidSchedule = date && new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    parseInt(hour),
    parseInt(minute)
  ) > new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIconFull className="h-5 w-5 text-primary" />
            Agendar Publicação
          </DialogTitle>
          <DialogDescription>
            Escolha a data e hora para publicar automaticamente o artigo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    format(date, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Horário</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger>
                    <SelectValue placeholder="Hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center text-muted-foreground">:</div>
              <div className="flex-1">
                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {minutes.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {date && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  O artigo será publicado em{" "}
                  <strong className="text-foreground">
                    {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </strong>{" "}
                  às{" "}
                  <strong className="text-foreground">
                    {hour}:{minute}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {!isValidSchedule && date && (
            <p className="text-sm text-destructive">
              A data/hora selecionada deve ser no futuro.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!isValidSchedule || isScheduling}
            className="gradient-primary"
          >
            {isScheduling ? "Agendando..." : "Confirmar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
