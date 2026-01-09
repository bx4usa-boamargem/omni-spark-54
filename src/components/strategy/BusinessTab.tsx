import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Building2, Sparkles, Trash2, AlertCircle, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BusinessProfile {
  id?: string;
  blog_id: string;
  project_name: string;
  language: string;
  country: string;
  niche: string;
  target_audience: string;
  tone_of_voice: string;
  long_description: string;
  concepts: string[];
  pain_points: string[];
  desires: string[];
  brand_keywords: string[];
}

interface BusinessTabProps {
  blogId: string;
  businessProfile: BusinessProfile;
  setBusinessProfile: React.Dispatch<React.SetStateAction<BusinessProfile>>;
}

const languages = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "pt-PT", label: "Português (Portugal)" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Español" },
];

const countries = [
  { value: "Brasil", label: "Brasil" },
  { value: "Portugal", label: "Portugal" },
  { value: "Estados Unidos", label: "Estados Unidos" },
  { value: "Reino Unido", label: "Reino Unido" },
  { value: "Espanha", label: "Espanha" },
  { value: "México", label: "México" },
  { value: "Argentina", label: "Argentina" },
];

const toneOptions = [
  { value: "friendly", label: "Amigável", description: "Conversa de parceiro, linguagem informal" },
  { value: "professional", label: "Profissional", description: "Tom empresarial mas acessível, sem jargões" },
  { value: "personal", label: "Pessoal", description: "Primeira pessoa, como especialista compartilhando experiência" },
  { value: "educational", label: "Educacional", description: "Tom didático, passo a passo claro" },
  { value: "authoritative", label: "Autoritativo", description: "Voz de especialista reconhecido no mercado" },
  { value: "conversational", label: "Conversacional", description: "Como um WhatsApp entre colegas de profissão" },
];

export function BusinessTab({ blogId, businessProfile, setBusinessProfile }: BusinessTabProps) {
  const [saving, setSaving] = useState(false);
  const [generatingConcepts, setGeneratingConcepts] = useState(false);
  const [generatingPainPoints, setGeneratingPainPoints] = useState(false);
  const [generatingDesires, setGeneratingDesires] = useState(false);
  const [newConcept, setNewConcept] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newPainPoint, setNewPainPoint] = useState("");
  const [newDesire, setNewDesire] = useState("");

  const handleSave = async () => {
    if (!blogId) return;

    setSaving(true);
    try {
      const dataToSave = {
        project_name: businessProfile.project_name,
        language: businessProfile.language,
        country: businessProfile.country,
        niche: businessProfile.niche,
        target_audience: businessProfile.target_audience,
        tone_of_voice: businessProfile.tone_of_voice,
        long_description: businessProfile.long_description,
        concepts: businessProfile.concepts,
        pain_points: businessProfile.pain_points,
        desires: businessProfile.desires,
        brand_keywords: businessProfile.brand_keywords,
      };

      if (businessProfile.id) {
        await supabase
          .from("business_profile")
          .update(dataToSave)
          .eq("id", businessProfile.id);
      } else {
        const { data } = await supabase
          .from("business_profile")
          .insert({ ...dataToSave, blog_id: blogId })
          .select()
          .single();

        if (data) {
          setBusinessProfile((prev) => ({ ...prev, id: data.id }));
        }
      }
      toast.success("Perfil salvo com sucesso!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const addArrayItem = (field: keyof BusinessProfile, value: string, setValue: (v: string) => void) => {
    if (!value.trim()) return;
    const currentValue = businessProfile[field];
    if (Array.isArray(currentValue)) {
      setBusinessProfile((prev) => ({
        ...prev,
        [field]: [...currentValue, value.trim()],
      }));
    }
    setValue("");
  };

  const removeArrayItem = (field: keyof BusinessProfile, index: number) => {
    const currentValue = businessProfile[field];
    if (Array.isArray(currentValue)) {
      setBusinessProfile((prev) => ({
        ...prev,
        [field]: currentValue.filter((_, i) => i !== index),
      }));
    }
  };

  const clearArrayField = (field: keyof BusinessProfile) => {
    setBusinessProfile((prev) => ({
      ...prev,
      [field]: [],
    }));
  };

  const handleGenerateItems = async (type: "concepts" | "pain_points" | "desires") => {
    if (!businessProfile.long_description && !businessProfile.niche) {
      toast.error("Preencha a descrição do negócio ou o nicho antes de gerar sugestões");
      return;
    }

    const setLoading = type === "concepts" ? setGeneratingConcepts : type === "pain_points" ? setGeneratingPainPoints : setGeneratingDesires;
    const field = type === "concepts" ? "concepts" : type === "pain_points" ? "pain_points" : "desires";
    const existingItems = businessProfile[field];
    const labelMap = { concepts: "conceitos", pain_points: "dores", desires: "desejos" };

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-concepts", {
        body: {
          long_description: businessProfile.long_description,
          niche: businessProfile.niche,
          target_audience: businessProfile.target_audience,
          existing_items: existingItems,
          type,
        },
      });

      if (error) throw error;

      if (data?.items && Array.isArray(data.items)) {
        setBusinessProfile((prev) => ({
          ...prev,
          [field]: [...(prev[field] as string[]), ...data.items],
        }));
        toast.success(`${data.items.length} ${labelMap[type]} gerados!`);
      }
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      toast.error(`Erro ao gerar ${labelMap[type]}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Informações do Projeto</CardTitle>
              <CardDescription>
                Essas informações ajudam a IA a entender melhor seu negócio e gerar conteúdo mais relevante.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Name, Language, Country */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="project_name">Nome do Projeto</Label>
              <Input
                id="project_name"
                placeholder="Ex: Blog da Empresa XYZ"
                value={businessProfile.project_name}
                onChange={(e) => setBusinessProfile((prev) => ({ ...prev, project_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <Select
                value={businessProfile.language}
                onValueChange={(value) => setBusinessProfile((prev) => ({ ...prev, language: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o idioma" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Select
                value={businessProfile.country}
                onValueChange={(value) => setBusinessProfile((prev) => ({ ...prev, country: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o país" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Niche and Tone */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="niche">Nicho/Área de atuação</Label>
              <Input
                id="niche"
                placeholder="Ex: Marketing Digital, Saúde, Finanças..."
                value={businessProfile.niche}
                onChange={(e) => setBusinessProfile((prev) => ({ ...prev, niche: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tom de voz</Label>
              <Select
                value={businessProfile.tone_of_voice}
                onValueChange={(value) => setBusinessProfile((prev) => ({ ...prev, tone_of_voice: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value}>
                      {tone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="audience">Descrição do público-alvo</Label>
            <Textarea
              id="audience"
              placeholder="Descreva quem é seu público ideal, seus interesses e necessidades..."
              value={businessProfile.target_audience}
              onChange={(e) => setBusinessProfile((prev) => ({ ...prev, target_audience: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Long Description */}
          <div className="space-y-2">
            <Label htmlFor="long_description">Descrição longa do negócio</Label>
            <Textarea
              id="long_description"
              placeholder="Descreva em detalhes seu negócio, produtos/serviços, diferenciais, história..."
              value={businessProfile.long_description}
              onChange={(e) => setBusinessProfile((prev) => ({ ...prev, long_description: e.target.value }))}
              rows={5}
            />
          </div>

          {/* Concepts */}
          <Card className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Conceitos</CardTitle>
                  <CardDescription className="text-sm">
                    Lista os conceitos relevantes para o seu público, desde os conceitos mais básicos até os mais avançados.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateItems("concepts")}
                  disabled={generatingConcepts}
                >
                  {generatingConcepts ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar sugestões
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {businessProfile.concepts.map((concept, i) => (
                  <Badge key={i} variant="default" className="gap-1 px-3 py-1">
                    {concept}
                    <button onClick={() => removeArrayItem("concepts", i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: CRM, Funil de Vendas, Lead, Persona..."
                  value={newConcept}
                  onChange={(e) => setNewConcept(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("concepts", newConcept, setNewConcept))}
                />
                <Button type="button" variant="secondary" onClick={() => addArrayItem("concepts", newConcept, setNewConcept)}>
                  <Plus className="h-4 w-4" />
                </Button>
                {businessProfile.concepts.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => clearArrayField("concepts")}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Limpar lista
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Brand Keywords */}
          <div className="space-y-2">
            <Label>Palavras-chave da marca</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar palavra-chave..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("brand_keywords", newKeyword, setNewKeyword))}
              />
              <Button type="button" variant="secondary" onClick={() => addArrayItem("brand_keywords", newKeyword, setNewKeyword)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {businessProfile.brand_keywords.map((kw, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {kw}
                  <button onClick={() => removeArrayItem("brand_keywords", i)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Pain Points */}
          <Card className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <CardTitle className="text-base">Dores do público</CardTitle>
                    <CardDescription className="text-sm">
                      Problemas e frustrações que seu público enfrenta no dia a dia.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateItems("pain_points")}
                  disabled={generatingPainPoints}
                >
                  {generatingPainPoints ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar sugestões
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {businessProfile.pain_points.map((pp, i) => (
                  <Badge key={i} variant="outline" className="gap-1 border-destructive/30 text-destructive px-3 py-1">
                    {pp}
                    <button onClick={() => removeArrayItem("pain_points", i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Dificuldade em gerar leads qualificados..."
                  value={newPainPoint}
                  onChange={(e) => setNewPainPoint(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("pain_points", newPainPoint, setNewPainPoint))}
                />
                <Button type="button" variant="secondary" onClick={() => addArrayItem("pain_points", newPainPoint, setNewPainPoint)}>
                  <Plus className="h-4 w-4" />
                </Button>
                {businessProfile.pain_points.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => clearArrayField("pain_points")}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Limpar lista
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Desires */}
          <Card className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-green-600" />
                  <div>
                    <CardTitle className="text-base">Desejos do público</CardTitle>
                    <CardDescription className="text-sm">
                      Resultados e transformações que seu público deseja alcançar.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateItems("desires")}
                  disabled={generatingDesires}
                >
                  {generatingDesires ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar sugestões
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {businessProfile.desires.map((d, i) => (
                  <Badge key={i} variant="outline" className="gap-1 border-green-500/30 text-green-600 px-3 py-1">
                    {d}
                    <button onClick={() => removeArrayItem("desires", i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Aumentar vendas online, Automatizar processos..."
                  value={newDesire}
                  onChange={(e) => setNewDesire(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("desires", newDesire, setNewDesire))}
                />
                <Button type="button" variant="secondary" onClick={() => addArrayItem("desires", newDesire, setNewDesire)}>
                  <Plus className="h-4 w-4" />
                </Button>
                {businessProfile.desires.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => clearArrayField("desires")}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Limpar lista
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
