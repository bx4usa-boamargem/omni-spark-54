import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamRole } from "@/hooks/useTeam";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/hooks/useTeamPermissions";
import { UserPlus, Loader2, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateTeamMemberDialogProps {
  blogId: string;
  onMemberCreated: () => void;
  canCreate: boolean;
  teamLimit: number;
  currentCount: number;
  children?: React.ReactNode;
}

interface Credentials {
  email: string;
  password: string;
}

export function CreateTeamMemberDialog({ 
  blogId,
  onMemberCreated,
  canCreate, 
  teamLimit, 
  currentCount,
  children 
}: CreateTeamMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!email.trim() || !fullName.trim()) {
      toast.error("Preencha nome e email");
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          email: email.trim(),
          fullName: fullName.trim(),
          blogId,
          role,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(data.message || "Membro criado com sucesso!");
      
      if (data.credentials) {
        setCredentials(data.credentials);
      }
      setIsExistingUser(data.isExistingUser || false);
      
      onMemberCreated();

    } catch (error) {
      console.error("Error creating team member:", error);
      toast.error("Erro ao criar membro da equipe");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!credentials) return;
    
    const text = `Email: ${credentials.email}\nSenha: ${credentials.password}`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Credenciais copiadas!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEmail("");
    setFullName("");
    setRole("editor");
    setCredentials(null);
    setIsExistingUser(false);
    setCopied(false);
  };

  const availableRoles: TeamRole[] = ["admin", "editor", "viewer"];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {children || (
          <Button disabled={!canCreate}>
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar membro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar membro da equipe</DialogTitle>
          <DialogDescription>
            A conta será criada automaticamente. {currentCount}/{teamLimit} membros.
          </DialogDescription>
        </DialogHeader>
        
        {!canCreate ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              Você atingiu o limite de membros do seu plano.
            </p>
            <Button variant="outline" onClick={handleClose}>
              Fazer upgrade
            </Button>
          </div>
        ) : credentials ? (
          <div className="py-4 space-y-4">
            <Alert className="border-green-500/50 bg-green-500/10">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Membro criado com sucesso!
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Envie as credenciais abaixo para <strong>{fullName}</strong> acessar a plataforma:
              </p>
              
              <div className="p-4 rounded-lg bg-muted/50 border space-y-2 font-mono text-sm">
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-medium">{credentials.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Senha:</span>{" "}
                  <span className="font-medium">{credentials.password}</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleCopyCredentials}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar credenciais
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                O membro deve trocar a senha no primeiro acesso.
              </p>
            </div>
            
            <DialogFooter>
              <Button onClick={handleClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : isExistingUser ? (
          <div className="py-4 space-y-4">
            <Alert className="border-green-500/50 bg-green-500/10">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Membro adicionado com sucesso!
              </AlertDescription>
            </Alert>
            
            <p className="text-sm text-muted-foreground">
              <strong>{fullName}</strong> já possui uma conta e foi adicionado à equipe. 
              Ele pode acessar com as credenciais existentes.
            </p>
            
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
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  placeholder="Nome do colaborador"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              
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
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A conta será criada instantaneamente. Sem necessidade de convite ou confirmação por email.
                </AlertDescription>
              </Alert>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar membro
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
