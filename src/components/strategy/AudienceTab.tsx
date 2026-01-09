import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, User, Trash2, Sparkles, AlertCircle, ThumbsUp, ShieldQuestion, X, Pencil, Wand2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Persona {
  id: string;
  name: string;
  age_range: string;
  profession: string;
  goals: string[];
  challenges: string[];
  description: string;
  problems: string[];
  solutions: string[];
  objections: string[];
}

interface AudienceTabProps {
  blogId: string;
  personas: Persona[];
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
  niche: string;
}

export function AudienceTab({ blogId, personas, setPersonas, niche }: AudienceTabProps) {
  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [savingPersona, setSavingPersona] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState<string | null>(null);
  const [improvingPersona, setImprovingPersona] = useState(false);
  const [improvingField, setImprovingField] = useState<string | null>(null);
  const [editingBadge, setEditingBadge] = useState<{ field: string; index: number } | null>(null);
  const [editingBadgeValue, setEditingBadgeValue] = useState("");
  
  const [newPersona, setNewPersona] = useState<Partial<Persona>>({
    name: "",
    age_range: "",
    profession: "",
    goals: [],
    challenges: [],
    description: "",
    problems: [],
    solutions: [],
    objections: [],
  });

  const [newProblem, setNewProblem] = useState("");
  const [newSolution, setNewSolution] = useState("");
  const [newObjection, setNewObjection] = useState("");
  
  const [editPersonaData, setEditPersonaData] = useState<Partial<Persona>>({});

  const selectedPersonaData = personas.find((p) => p.id === selectedPersona);

  const handleCreatePersona = async () => {
    if (!newPersona.name?.trim()) {
      toast.error("Informe o nome da persona");
      return;
    }

    setSavingPersona(true);
    try {
      const { data, error } = await supabase
        .from("personas")
        .insert({
          blog_id: blogId,
          name: newPersona.name,
          age_range: newPersona.age_range || null,
          profession: newPersona.profession || null,
          goals: newPersona.goals || [],
          challenges: newPersona.challenges || [],
          description: newPersona.description || null,
          problems: newPersona.problems || [],
          solutions: newPersona.solutions || [],
          objections: newPersona.objections || [],
        })
        .select()
        .single();

      if (error) throw error;

      setPersonas((prev) => [data as Persona, ...prev]);
      setShowPersonaForm(false);
      setNewPersona({
        name: "",
        age_range: "",
        profession: "",
        goals: [],
        challenges: [],
        description: "",
        problems: [],
        solutions: [],
        objections: [],
      });
      toast.success("Persona criada com sucesso!");
    } catch (error) {
      console.error("Error creating persona:", error);
      toast.error("Erro ao criar persona");
    } finally {
      setSavingPersona(false);
    }
  };

  const handleDeletePersona = async (personaId: string) => {
    try {
      await supabase.from("personas").delete().eq("id", personaId);
      setPersonas((prev) => prev.filter((p) => p.id !== personaId));
      if (selectedPersona === personaId) setSelectedPersona(null);
      toast.success("Persona removida!");
    } catch (error) {
      console.error("Error deleting persona:", error);
      toast.error("Erro ao remover persona");
    }
  };

  const handleUpdatePersonaArray = async (
    personaId: string,
    field: "problems" | "solutions" | "objections",
    value: string[],
  ) => {
    try {
      await supabase.from("personas").update({ [field]: value }).eq("id", personaId);
      setPersonas((prev) =>
        prev.map((p) => (p.id === personaId ? { ...p, [field]: value } : p)),
      );
    } catch (error) {
      console.error("Error updating persona:", error);
      toast.error("Erro ao atualizar persona");
    }
  };

  const handleUpdatePersona = async (personaId: string, updates: Partial<Persona>) => {
    try {
      const { error } = await supabase
        .from("personas")
        .update(updates)
        .eq("id", personaId);

      if (error) throw error;

      setPersonas((prev) =>
        prev.map((p) => (p.id === personaId ? { ...p, ...updates } : p))
      );
      setShowEditModal(false);
      toast.success("Persona atualizada!");
    } catch (error) {
      console.error("Error updating persona:", error);
      toast.error("Erro ao atualizar persona");
    }
  };

  const openEditModal = (persona: Persona) => {
    setEditPersonaData({
      name: persona.name,
      age_range: persona.age_range,
      profession: persona.profession,
      description: persona.description,
    });
    setSelectedPersona(persona.id);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPersona || !editPersonaData.name?.trim()) {
      toast.error("Informe o nome da persona");
      return;
    }
    setSavingPersona(true);
    await handleUpdatePersona(selectedPersona, editPersonaData);
    setSavingPersona(false);
  };

  const improvePersonaWithAI = async (type: string) => {
    if (!selectedPersonaData) return;
    
    setImprovingPersona(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-persona-suggestions", {
        body: {
          improvePersona: true,
          improvementType: type,
          personaData: selectedPersonaData,
          niche,
        },
      });

      if (error) throw error;

      if (data?.improved) {
        await handleUpdatePersona(selectedPersonaData.id, data.improved);
        toast.success("Persona melhorada com IA!");
      }
    } catch (error) {
      console.error("Error improving persona:", error);
      toast.error("Erro ao melhorar persona");
    } finally {
      setImprovingPersona(false);
    }
  };

  const improveFieldWithAI = async (field: "problems" | "solutions" | "objections") => {
    if (!selectedPersonaData) return;
    
    const currentItems = selectedPersonaData[field] || [];
    if (currentItems.length === 0) {
      toast.error("Adicione alguns itens primeiro para melhorar");
      return;
    }

    setImprovingField(field);
    try {
      const { data, error } = await supabase.functions.invoke("generate-persona-suggestions", {
        body: {
          improveItems: true,
          field,
          items: currentItems,
          personaName: selectedPersonaData.name,
          personaDescription: selectedPersonaData.description,
          profession: selectedPersonaData.profession,
          niche,
        },
      });

      if (error) throw error;

      if (data?.improved && Array.isArray(data.improved)) {
        await handleUpdatePersonaArray(selectedPersonaData.id, field, data.improved);
        toast.success(`${currentItems.length} itens melhorados!`);
      }
    } catch (error) {
      console.error("Error improving items:", error);
      toast.error("Erro ao melhorar itens");
    } finally {
      setImprovingField(null);
    }
  };

  const startEditingBadge = (field: string, index: number, value: string) => {
    setEditingBadge({ field, index });
    setEditingBadgeValue(value);
  };

  const saveEditingBadge = async () => {
    if (!editingBadge || !selectedPersonaData) return;
    
    const field = editingBadge.field as "problems" | "solutions" | "objections";
    const current = selectedPersonaData[field] || [];
    const updated = [...current];
    updated[editingBadge.index] = editingBadgeValue.trim();
    
    if (editingBadgeValue.trim()) {
      await handleUpdatePersonaArray(selectedPersonaData.id, field, updated);
    }
    
    setEditingBadge(null);
    setEditingBadgeValue("");
  };

  const addItemToPersona = (field: "problems" | "solutions" | "objections", value: string) => {
    if (!value.trim() || !selectedPersonaData) return;
    const current = selectedPersonaData[field] || [];
    handleUpdatePersonaArray(selectedPersonaData.id, field, [...current, value.trim()]);
    if (field === "problems") setNewProblem("");
    if (field === "solutions") setNewSolution("");
    if (field === "objections") setNewObjection("");
  };

  const removeItemFromPersona = (field: "problems" | "solutions" | "objections", index: number) => {
    if (!selectedPersonaData) return;
    const current = selectedPersonaData[field] || [];
    handleUpdatePersonaArray(
      selectedPersonaData.id,
      field,
      current.filter((_, i) => i !== index),
    );
  };

  const clearPersonaList = (field: "problems" | "solutions" | "objections") => {
    if (!selectedPersonaData) return;
    handleUpdatePersonaArray(selectedPersonaData.id, field, []);
  };

  const generateAISuggestions = async (field: "problems" | "solutions" | "objections") => {
    if (!selectedPersonaData) return;

    setGeneratingSuggestions(field);
    try {
      const { data, error } = await supabase.functions.invoke("generate-persona-suggestions", {
        body: {
          personaName: selectedPersonaData.name,
          personaDescription: selectedPersonaData.description,
          profession: selectedPersonaData.profession,
          niche,
          field,
          existing: selectedPersonaData[field] || [],
        },
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        const current = selectedPersonaData[field] || [];
        handleUpdatePersonaArray(selectedPersonaData.id, field, [...current, ...data.suggestions]);
        toast.success(`${data.suggestions.length} sugestões adicionadas!`);
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast.error("Erro ao gerar sugestões");
    } finally {
      setGeneratingSuggestions(null);
    }
  };

  const generatePersonasWithAI = async () => {
    if (!niche) {
      toast.error("Defina o nicho do negócio na aba 'Meu Negócio' primeiro");
      return;
    }

    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-persona-suggestions", {
        body: {
          generatePersonas: true,
          niche,
          blogId,
        },
      });

      if (error) throw error;

      if (data?.personas && Array.isArray(data.personas)) {
        for (const persona of data.personas) {
          const { data: inserted } = await supabase
            .from("personas")
            .insert({
              blog_id: blogId,
              name: persona.name,
              age_range: persona.age_range,
              profession: persona.profession,
              description: persona.description,
              goals: persona.goals || [],
              challenges: persona.challenges || [],
              problems: persona.problems || [],
              solutions: persona.solutions || [],
              objections: persona.objections || [],
            })
            .select()
            .single();

          if (inserted) {
            setPersonas((prev) => [inserted as Persona, ...prev]);
          }
        }
        toast.success(`${data.personas.length} personas geradas com sucesso!`);
      }
    } catch (error) {
      console.error("Error generating personas:", error);
      toast.error("Erro ao gerar personas");
    } finally {
      setGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Personas</CardTitle>
              <CardDescription>
                Defina personas para que a IA escreva de forma mais direcionada ao seu público.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {personas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma persona criada</p>
              <p className="text-sm mb-4">
                Crie personas manualmente ou use a IA para gerar automaticamente
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowPersonaForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar manualmente
                </Button>
                <Button onClick={generatePersonasWithAI} disabled={generatingAI}>
                  {generatingAI ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar com IA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Persona Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personas.map((persona) => (
                  <Card
                    key={persona.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedPersona === persona.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "hover:border-muted-foreground/30",
                    )}
                    onClick={() => setSelectedPersona(persona.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10 shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold truncate">{persona.name}</h4>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(persona);
                                }}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePersona(persona.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {persona.profession || "Sem profissão"} {persona.age_range && `• ${persona.age_range}`}
                          </p>
                          {persona.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {persona.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Create Persona Card */}
                <Dialog open={showPersonaForm} onOpenChange={setShowPersonaForm}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer border-dashed hover:border-primary/50 hover:bg-muted/30 transition-colors">
                      <CardContent className="p-4 flex items-center justify-center h-full min-h-[120px]">
                        <div className="text-center">
                          <div className="p-2 rounded-full bg-muted mx-auto mb-2 w-fit">
                            <Plus className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">Criar persona</p>
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Nova Persona</DialogTitle>
                      <DialogDescription>
                        Crie uma persona para representar um segmento do seu público
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome da persona</Label>
                        <Input
                          placeholder="Ex: Maria Empreendedora"
                          value={newPersona.name}
                          onChange={(e) => setNewPersona((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Faixa etária</Label>
                          <Input
                            placeholder="Ex: 30-45 anos"
                            value={newPersona.age_range}
                            onChange={(e) => setNewPersona((prev) => ({ ...prev, age_range: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Profissão</Label>
                          <Input
                            placeholder="Ex: Empresária"
                            value={newPersona.profession}
                            onChange={(e) => setNewPersona((prev) => ({ ...prev, profession: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição detalhada</Label>
                        <Textarea
                          placeholder="Descreva quem é essa persona, seus interesses, comportamentos..."
                          value={newPersona.description}
                          onChange={(e) => setNewPersona((prev) => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowPersonaForm(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreatePersona} disabled={savingPersona}>
                          {savingPersona && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Criar Persona
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Generate with AI Button */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={generatePersonasWithAI} disabled={generatingAI}>
                  {generatingAI ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar com IA
                </Button>
              </div>

              {/* Selected Persona Details */}
              {selectedPersonaData && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{selectedPersonaData.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedPersonaData.profession} {selectedPersonaData.age_range && `• ${selectedPersonaData.age_range}`}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={improvingPersona}>
                          {improvingPersona ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Wand2 className="h-4 w-4 mr-2" />
                          )}
                          Melhorar com IA
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => improvePersonaWithAI("expand_description")}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Expandir descrição
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => improvePersonaWithAI("add_behaviors")}>
                          <User className="h-4 w-4 mr-2" />
                          Adicionar detalhes comportamentais
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => improvePersonaWithAI("professional_tone")}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reformular tom profissional
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => improvePersonaWithAI("fill_empty")}>
                          <Plus className="h-4 w-4 mr-2" />
                          Completar campos vazios
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {selectedPersonaData.description && (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedPersonaData.description}
                    </p>
                  )}

                  {/* Problems Section */}
                  <Card className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <CardTitle className="text-base">Problemas que enfrenta</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearPersonaList("problems")}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Limpar lista
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateAISuggestions("problems")}
                            disabled={generatingSuggestions === "problems"}
                          >
                            {generatingSuggestions === "problems" ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="h-4 w-4 mr-1" />
                            )}
                            Gerar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => improveFieldWithAI("problems")}
                            disabled={improvingField === "problems"}
                          >
                            {improvingField === "problems" ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            Melhorar
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        Para um blog de {niche || "seu nicho"}, considerando a persona {selectedPersonaData.name}, quais são os principais problemas?
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(selectedPersonaData.problems || []).map((item, i) => (
                          editingBadge?.field === "problems" && editingBadge.index === i ? (
                            <Input
                              key={i}
                              autoFocus
                              className="h-7 w-48 text-sm"
                              value={editingBadgeValue}
                              onChange={(e) => setEditingBadgeValue(e.target.value)}
                              onBlur={saveEditingBadge}
                              onKeyDown={(e) => e.key === "Enter" && saveEditingBadge()}
                            />
                          ) : (
                            <Badge 
                              key={i} 
                              variant="outline" 
                              className="gap-1 border-destructive/30 cursor-pointer hover:bg-muted/50"
                              onClick={() => startEditingBadge("problems", i, item)}
                            >
                              {item}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItemFromPersona("problems", i);
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Adicionar problema..."
                          value={newProblem}
                          onChange={(e) => setNewProblem(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && addItemToPersona("problems", newProblem)
                          }
                        />
                        <Button
                          variant="secondary"
                          onClick={() => addItemToPersona("problems", newProblem)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Solutions Section */}
                  <Card className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                          <CardTitle className="text-base">Soluções que pode utilizar</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearPersonaList("solutions")}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Limpar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateAISuggestions("solutions")}
                            disabled={generatingSuggestions === "solutions"}
                          >
                            {generatingSuggestions === "solutions" ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="h-4 w-4 mr-1" />
                            )}
                            Gerar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => improveFieldWithAI("solutions")}
                            disabled={improvingField === "solutions"}
                          >
                            {improvingField === "solutions" ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            Melhorar
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        Soluções e serviços que a persona pode utilizar para resolver seus problemas.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(selectedPersonaData.solutions || []).map((item, i) => (
                          editingBadge?.field === "solutions" && editingBadge.index === i ? (
                            <Input
                              key={i}
                              autoFocus
                              className="h-7 w-48 text-sm"
                              value={editingBadgeValue}
                              onChange={(e) => setEditingBadgeValue(e.target.value)}
                              onBlur={saveEditingBadge}
                              onKeyDown={(e) => e.key === "Enter" && saveEditingBadge()}
                            />
                          ) : (
                            <Badge 
                              key={i} 
                              variant="outline" 
                              className="gap-1 border-green-500/30 cursor-pointer hover:bg-muted/50"
                              onClick={() => startEditingBadge("solutions", i, item)}
                            >
                              {item}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItemFromPersona("solutions", i);
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Adicionar solução..."
                          value={newSolution}
                          onChange={(e) => setNewSolution(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && addItemToPersona("solutions", newSolution)
                          }
                        />
                        <Button
                          variant="secondary"
                          onClick={() => addItemToPersona("solutions", newSolution)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Objections Section */}
                  <Card className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldQuestion className="h-4 w-4 text-amber-600" />
                          <CardTitle className="text-base">Objeções que pode ter</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearPersonaList("objections")}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Limpar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateAISuggestions("objections")}
                            disabled={generatingSuggestions === "objections"}
                          >
                            {generatingSuggestions === "objections" ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="h-4 w-4 mr-1" />
                            )}
                            Gerar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => improveFieldWithAI("objections")}
                            disabled={improvingField === "objections"}
                          >
                            {improvingField === "objections" ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            Melhorar
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        Objeções e resistências que a persona pode ter em relação às soluções.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(selectedPersonaData.objections || []).map((item, i) => (
                          editingBadge?.field === "objections" && editingBadge.index === i ? (
                            <Input
                              key={i}
                              autoFocus
                              className="h-7 w-48 text-sm"
                              value={editingBadgeValue}
                              onChange={(e) => setEditingBadgeValue(e.target.value)}
                              onBlur={saveEditingBadge}
                              onKeyDown={(e) => e.key === "Enter" && saveEditingBadge()}
                            />
                          ) : (
                            <Badge 
                              key={i} 
                              variant="outline" 
                              className="gap-1 border-amber-500/30 cursor-pointer hover:bg-muted/50"
                              onClick={() => startEditingBadge("objections", i, item)}
                            >
                              {item}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItemFromPersona("objections", i);
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Adicionar objeção..."
                          value={newObjection}
                          onChange={(e) => setNewObjection(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && addItemToPersona("objections", newObjection)
                          }
                        />
                        <Button
                          variant="secondary"
                          onClick={() => addItemToPersona("objections", newObjection)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Persona Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Persona</DialogTitle>
            <DialogDescription>Atualize os dados da persona</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da persona</Label>
              <Input
                value={editPersonaData.name || ""}
                onChange={(e) => setEditPersonaData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Faixa etária</Label>
                <Input
                  value={editPersonaData.age_range || ""}
                  onChange={(e) => setEditPersonaData((prev) => ({ ...prev, age_range: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Profissão</Label>
                <Input
                  value={editPersonaData.profession || ""}
                  onChange={(e) => setEditPersonaData((prev) => ({ ...prev, profession: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editPersonaData.description || ""}
                onChange={(e) => setEditPersonaData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={savingPersona}>
                {savingPersona && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
