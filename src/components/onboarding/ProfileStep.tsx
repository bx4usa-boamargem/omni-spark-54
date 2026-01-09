import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Users } from "lucide-react";

interface ProfileStepProps {
  phone: string;
  referralSource: string;
  onPhoneChange: (value: string) => void;
  onReferralSourceChange: (value: string) => void;
}

const REFERRAL_OPTIONS = [
  { value: "google", label: "Pesquisa no Google" },
  { value: "indicacao", label: "Indicação de amigo/colega" },
  { value: "redes_sociais", label: "Redes sociais (Instagram, LinkedIn, etc.)" },
  { value: "youtube", label: "YouTube" },
  { value: "podcast", label: "Podcast" },
  { value: "evento", label: "Evento ou conferência" },
  { value: "outro", label: "Outro" },
];

export function ProfileStep({
  phone,
  referralSource,
  onPhoneChange,
  onReferralSourceChange,
}: ProfileStepProps) {
  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "");
    
    // Limita a 11 dígitos (celular com DDD)
    const limited = numbers.slice(0, 11);
    
    // Formata: (XX) XXXXX-XXXX
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onPhoneChange(formatted);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold mb-2">
          Perfil básico
        </h2>
        <p className="text-muted-foreground">
          Informações opcionais para melhorar sua experiência.
        </p>
      </div>

      {/* Telefone */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="phone" className="text-base font-medium">
            WhatsApp (opcional)
          </Label>
        </div>
        <Input
          id="phone"
          type="tel"
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={handlePhoneChange}
          className="max-w-xs"
        />
        <p className="text-sm text-muted-foreground">
          Para suporte prioritário e novidades exclusivas
        </p>
      </div>

      {/* Como conheceu */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="referral" className="text-base font-medium">
            Como conheceu o OMNISEEN?
          </Label>
        </div>
        <Select value={referralSource} onValueChange={onReferralSourceChange}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent>
            {REFERRAL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dica de valor */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">💡 Dica:</span> Seu blog será 
          criado automaticamente na próxima etapa. Você poderá personalizar cores, 
          logo e domínio depois no painel.
        </p>
      </div>
    </div>
  );
}
