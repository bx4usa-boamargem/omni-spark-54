import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBlog } from "@/hooks/useBlog";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Zap, Calendar, Clock, Target, Sparkles, Save, Loader2 } from "lucide-react";

interface AutomationSettings {
  id?: string;
  blog_id: string;
  is_active: boolean;
  frequency: string;
  articles_per_period: number;
  preferred_days: string[];
  preferred_time: string;
  auto_publish: boolean;
  niche_keywords: string[];
  tone: string;
  generate_images: boolean;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Segunda' },
  { value: 'tuesday', label: 'Terça' },
  { value: 'wednesday', label: 'Quarta' },
  { value: 'thursday', label: 'Quinta' },
  { value: 'friday', label: 'Sexta' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

const TONES = [
  { value: 'professional', label: 'Profissional' },
  { value: 'friendly', label: 'Amigável' },
  { value: 'authoritative', label: 'Autoritativo' },
  { value: 'casual', label: 'Casual' },
  { value: 'educational', label: 'Educacional' },
];

export default function AutomationSettings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { blog, loading: blogLoading } = useBlog();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  
  const [settings, setSettings] = useState<AutomationSettings>({
    blog_id: "",
    is_active: false,
    frequency: "weekly",
    articles_per_period: 1,
    preferred_days: ["monday"],
    preferred_time: "09:00",
    auto_publish: true,
    niche_keywords: [],
    tone: "professional",
    generate_images: true
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !blog) return;

      try {
        // Get existing automation settings
        const { data: automation } = await supabase
          .from("blog_automation")
          .select("*")
          .eq("blog_id", blog.id)
          .single();

        if (automation) {
          setSettings({
            ...automation,
            preferred_days: automation.preferred_days || ["monday"],
            niche_keywords: automation.niche_keywords || [],
            generate_images: automation.generate_images !== false
          });
        } else {
          setSettings(prev => ({ ...prev, blog_id: blog.id }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (blog) {
      fetchData();
    } else if (!blogLoading) {
      setLoading(false);
    }
  }, [user, blog, blogLoading]);

  const blogId = blog?.id || null;

  const handleSave = async () => {
    if (!blogId) return;

    setSaving(true);
    try {
      const dataToSave = {
        blog_id: blogId,
        is_active: settings.is_active,
        frequency: settings.frequency,
        articles_per_period: settings.articles_per_period,
        preferred_days: settings.preferred_days,
        preferred_time: settings.preferred_time,
        auto_publish: settings.auto_publish,
        niche_keywords: settings.niche_keywords,
        tone: settings.tone,
        generate_images: settings.generate_images
      };

      if (settings.id) {
        const { error } = await supabase
          .from("blog_automation")
          .update(dataToSave)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blog_automation")
          .insert(dataToSave);

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas!",
        description: settings.is_active 
          ? "A automação está ativa e começará a gerar artigos."
          : "As configurações foram salvas."
      });
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !settings.niche_keywords.includes(keywordInput.trim())) {
      setSettings(prev => ({
        ...prev,
        niche_keywords: [...prev.niche_keywords, keywordInput.trim()]
      }));
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setSettings(prev => ({
      ...prev,
      niche_keywords: prev.niche_keywords.filter(k => k !== keyword)
    }));
  };

  const toggleDay = (day: string) => {
    setSettings(prev => ({
      ...prev,
      preferred_days: prev.preferred_days.includes(day)
        ? prev.preferred_days.filter(d => d !== day)
        : [...prev.preferred_days, day]
    }));
  };

  if (authLoading || blogLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-4xl">
        {/* Header interno */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Automação de Conteúdo
            </h1>
            <p className="text-muted-foreground">
              Configure a geração automática de artigos
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Ativar Automação */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Automação 100% Automática
                  </CardTitle>
                  <CardDescription>
                    Artigos serão gerados e publicados automaticamente
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.is_active}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </CardHeader>
            {settings.is_active && (
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Automação ativa - Artigos serão gerados conforme configurado
                </div>
              </CardContent>
            )}
          </Card>

          {/* Frequência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Frequência de Publicação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={settings.frequency}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Artigos por período</Label>
                  <Select
                    value={settings.articles_per_period.toString()}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, articles_per_period: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 7, 10].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} artigo{n > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias preferidos</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={settings.preferred_days.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horário preferido
                  </Label>
                  <Input
                    type="time"
                    value={settings.preferred_time}
                    onChange={(e) => setSettings(prev => ({ ...prev, preferred_time: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Publicar automaticamente?</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.auto_publish}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_publish: checked }))}
                    />
                    <span className="text-sm text-muted-foreground">
                      {settings.auto_publish ? "Sim, publicar direto" : "Não, salvar como rascunho"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gerar imagem de capa automaticamente?</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.generate_images}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, generate_images: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {settings.generate_images ? "Sim, gerar imagem com IA" : "Não, sem imagem automática"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nicho e Tom */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Configuração de Conteúdo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Tom do conteúdo</Label>
                <Select
                  value={settings.tone}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, tone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map(tone => (
                      <SelectItem key={tone.value} value={tone.value}>{tone.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Palavras-chave do nicho</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar palavra-chave..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" onClick={addKeyword} variant="outline">
                    Adicionar
                  </Button>
                </div>
                {settings.niche_keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {settings.niche_keywords.map(keyword => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeKeyword(keyword)}
                      >
                        {keyword} ×
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Estas palavras-chave ajudam a IA a sugerir temas relevantes para seu nicho
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Estimativa de Custo */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Estimativa de Custo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Artigos por período:</span>
                  <span className="font-medium">{settings.articles_per_period}</span>
                </div>
                <div className="flex justify-between">
                  <span>Custo estimado por artigo:</span>
                  <span className="font-medium">~R$ 0,30 - R$ 0,55</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-medium">Total por período:</span>
                  <span className="font-bold text-primary">
                    ~R$ {(settings.articles_per_period * 0.3).toFixed(2)} - R$ {(settings.articles_per_period * 0.55).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
