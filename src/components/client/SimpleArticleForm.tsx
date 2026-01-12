import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Zap, 
  Brain, 
  Loader2, 
  Mic, 
  MicOff,
  CalendarIcon,
  Clock,
  Image as ImageIcon,
  Send,
  CalendarClock
} from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface SimpleFormData {
  theme: string;
  generationMode: 'fast' | 'deep';
  // Scheduling options
  scheduleMode: 'now' | 'scheduled';
  scheduledDate?: Date;
  scheduledTime?: string;
  generateImages: boolean;
}

interface SimpleArticleFormProps {
  onGenerate: (data: SimpleFormData) => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const TIME_OPTIONS = [
  { value: '06:00', label: '06:00 - Madrugadores' },
  { value: '08:00', label: '08:00 - Manhã cedo' },
  { value: '09:00', label: '09:00 - Manhã (Padrão)' },
  { value: '12:00', label: '12:00 - Almoço' },
  { value: '18:00', label: '18:00 - Final do dia' },
  { value: '21:00', label: '21:00 - Noite' },
];

export function SimpleArticleForm({ onGenerate, isGenerating, disabled = false }: SimpleArticleFormProps) {
  const [theme, setTheme] = useState('');
  const [generationMode, setGenerationMode] = useState<'fast' | 'deep'>('deep');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [generateImages, setGenerateImages] = useState(true);
  
  const isLocked = isGenerating || disabled;
  
  const { 
    isListening, 
    transcript, 
    isSupported, 
    error: speechError,
    startListening, 
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  // Update theme when transcript changes
  useEffect(() => {
    if (transcript) {
      setTheme(prev => prev ? `${prev} ${transcript}` : transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Show speech error
  useEffect(() => {
    if (speechError) {
      toast.error(speechError);
    }
  }, [speechError]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) return;
    
    onGenerate({ 
      theme: theme.trim(), 
      generationMode,
      scheduleMode,
      scheduledDate: scheduleMode === 'scheduled' ? scheduledDate : undefined,
      scheduledTime: scheduleMode === 'scheduled' ? scheduledTime : undefined,
      generateImages
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Novo Artigo
        </CardTitle>
        <CardDescription>
          Digite ou fale o tema e a IA criará um artigo completo para você
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
          {/* Theme Input with Microphone */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme">Tema do Artigo</Label>
              {isSupported && (
                <Button 
                  type="button"
                  variant={isListening ? "destructive" : "ghost"}
                  size="sm"
                  onClick={toggleListening}
                  disabled={isLocked}
                  className={cn(
                    "gap-2 transition-all",
                    isListening && "animate-pulse"
                  )}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      Parar
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      Falar
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {/* Recording Indicator */}
            {isListening && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  Gravando... Fale o tema do seu artigo
                </span>
              </div>
            )}
            
            <Textarea
              id="theme"
              placeholder={isListening 
                ? 'Fale agora... 🎤' 
                : 'Ex: "Dicas para manter a casa limpa no verão" ou "Como escolher o melhor serviço de dedetização"'}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className={cn(
                "min-h-[120px] resize-none text-base",
                isListening && "border-red-500 ring-2 ring-red-500/20"
              )}
              disabled={isLocked}
            />
            <p className="text-xs text-muted-foreground">
              {isSupported 
                ? 'Digite ou use o microfone 🎤 para ditar o tema do seu artigo.'
                : 'Seja específico sobre o tema do seu negócio. Pense no que seus clientes perguntam.'}
            </p>
          </div>

          {/* Generation Mode */}
          <div className="space-y-2">
            <Label>Modo de Geração</Label>
            <RadioGroup
              value={generationMode}
              onValueChange={(value) => setGenerationMode(value as 'fast' | 'deep')}
              className="grid grid-cols-2 gap-3"
              disabled={isLocked}
            >
              <div>
                <RadioGroupItem value="fast" id="fast" className="peer sr-only" />
                <Label
                  htmlFor="fast"
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                >
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Rápido</p>
                    <p className="text-[10px] text-muted-foreground">400-1000 palavras</p>
                  </div>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem value="deep" id="deep" className="peer sr-only" />
                <Label
                  htmlFor="deep"
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                >
                  <Brain className="h-4 w-4 text-purple-500" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Profundo</p>
                    <p className="text-[10px] text-muted-foreground">1500-3000 palavras</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Publication Mode */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Publicação
            </Label>
            <RadioGroup
              value={scheduleMode}
              onValueChange={(value) => setScheduleMode(value as 'now' | 'scheduled')}
              className="grid grid-cols-2 gap-3"
              disabled={isLocked}
            >
              <div>
                <RadioGroupItem value="now" id="now" className="peer sr-only" />
                <Label
                  htmlFor="now"
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                >
                  <Send className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm">Publicar agora</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem value="scheduled" id="scheduled" className="peer sr-only" />
                <Label
                  htmlFor="scheduled"
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                >
                  <CalendarIcon className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">Agendar</span>
                </Label>
              </div>
            </RadioGroup>

            {/* Schedule Date/Time (only when scheduled) */}
            {scheduleMode === 'scheduled' && (
              <div className="grid grid-cols-2 gap-3 mt-3 p-3 rounded-lg bg-muted/50 border">
                {/* Date Picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Data
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left font-normal h-9"
                        disabled={isLocked}
                      >
                        {scheduledDate ? (
                          format(scheduledDate, 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          <span className="text-muted-foreground">Selecionar</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Horário
                  </Label>
                  <Select
                    value={scheduledTime}
                    onValueChange={setScheduledTime}
                    disabled={isLocked}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Image Generation Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium cursor-pointer" htmlFor="generate-images">
                  Gerar imagens automaticamente
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Capa + 3 imagens contextuais
                </p>
              </div>
            </div>
            <Switch
              id="generate-images"
              checked={generateImages}
              onCheckedChange={setGenerateImages}
              disabled={isLocked}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base gap-3"
            disabled={!theme.trim() || isLocked}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Gerar Artigo com IA
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
