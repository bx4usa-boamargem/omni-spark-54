import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamRole } from "@/hooks/useTeam";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/hooks/useTeamPermissions";
import { UserPlus, Loader2, Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";

interface InviteMemberDialogProps {
  onInvite: (email: string, role: TeamRole) => Promise<{ error?: string; success?: boolean; inviteLink?: string }>;
  canInvite: boolean;
  teamLimit: number;
  currentCount: number;
  children?: React.ReactNode;
}

export function InviteMemberDialog({ 
  onInvite, 
  canInvite, 
  teamLimit, 
  currentCount,
  children 
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("Digite um email válido");
      return;
    }

    setLoading(true);
    const result = await onInvite(email.trim(), role);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Convite criado com sucesso!");
      if (result.inviteLink) {
        setInviteLink(result.inviteLink);
      }
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEmail("");
    setRole("editor");
    setInviteLink(null);
    setCopied(false);
  };

  const availableRoles: TeamRole[] = ["admin", "editor", "viewer"];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {children || (
          <Button disabled={!canInvite}>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar membro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Convidar novo membro</DialogTitle>
          <DialogDescription>
            Convide alguém para colaborar no seu blog. {currentCount}/{teamLimit} membros.
          </DialogDescription>
        </DialogHeader>
        
        {!canInvite ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              Você atingiu o limite de membros do seu plano.
            </p>
            <Button variant="outline" onClick={handleClose}>
              Fazer upgrade
            </Button>
          </div>
        ) : inviteLink ? (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-5 w-5 text-success" />
                <span className="font-medium text-success">Convite criado!</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Envie o link abaixo para <strong>{email}</strong> aceitar o convite como <strong>{ROLE_LABELS[role]}</strong>.
              </p>
              <div className="flex gap-2">
                <Input 
                  value={inviteLink} 
                  readOnly 
                  className="text-xs font-mono"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                O convite expira em 7 dias.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colaborador@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Permissão</Label>
                <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma permissão" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{ROLE_LABELS[r]}</span>
                          <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleInvite} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar convite
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
