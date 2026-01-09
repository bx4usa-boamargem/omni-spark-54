import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Target, Briefcase, User, Building2 } from "lucide-react";

interface ContextStepProps {
  blogObjective: string;
  userType: string;
  onBlogObjectiveChange: (value: string) => void;
  onUserTypeChange: (value: string) => void;
}

export function ContextStep({
  blogObjective,
  userType,
  onBlogObjectiveChange,
  onUserTypeChange,
}: ContextStepProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold mb-2">
          Contexto rápido
        </h2>
        <p className="text-muted-foreground">
          Duas perguntas para personalizar sua experiência.
        </p>
      </div>

      {/* Objetivo do blog */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Qual é o objetivo do seu blog?</Label>
        <RadioGroup
          value={blogObjective}
          onValueChange={onBlogObjectiveChange}
          className="grid gap-3"
        >
          <div
            className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              blogObjective === "pessoal"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
            onClick={() => onBlogObjectiveChange("pessoal")}
          >
            <RadioGroupItem value="pessoal" id="pessoal" />
            <div className="p-2 rounded-lg bg-accent/20">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Label htmlFor="pessoal" className="cursor-pointer font-medium text-base">
                Blog pessoal
              </Label>
              <p className="text-sm text-muted-foreground">
                Compartilhar conhecimento, hobbies ou experiências
              </p>
            </div>
          </div>

          <div
            className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              blogObjective === "profissional"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
            onClick={() => onBlogObjectiveChange("profissional")}
          >
            <RadioGroupItem value="profissional" id="profissional" />
            <div className="p-2 rounded-lg bg-accent/20">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Label htmlFor="profissional" className="cursor-pointer font-medium text-base">
                Blog profissional
              </Label>
              <p className="text-sm text-muted-foreground">
                Gerar leads, vender produtos ou fortalecer marca
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Tipo de usuário */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Você é...</Label>
        <RadioGroup
          value={userType}
          onValueChange={onUserTypeChange}
          className="grid gap-3"
        >
          <div
            className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              userType === "pessoa_fisica"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
            onClick={() => onUserTypeChange("pessoa_fisica")}
          >
            <RadioGroupItem value="pessoa_fisica" id="pessoa_fisica" />
            <div className="p-2 rounded-lg bg-accent/20">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Label htmlFor="pessoa_fisica" className="cursor-pointer font-medium text-base">
                Profissional autônomo
              </Label>
              <p className="text-sm text-muted-foreground">
                Freelancer, consultor ou criador de conteúdo
              </p>
            </div>
          </div>

          <div
            className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              userType === "empresa"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
            onClick={() => onUserTypeChange("empresa")}
          >
            <RadioGroupItem value="empresa" id="empresa" />
            <div className="p-2 rounded-lg bg-accent/20">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Label htmlFor="empresa" className="cursor-pointer font-medium text-base">
                Empresa
              </Label>
              <p className="text-sm text-muted-foreground">
                Startup, agência, PME ou grande empresa
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
