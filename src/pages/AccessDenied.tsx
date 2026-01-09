import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, ArrowLeft, Home } from "lucide-react";

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto p-4 rounded-full bg-destructive/10 mb-4">
            <ShieldX className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Acesso Negado</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar esta página. Entre em contato com o administrador do blog se acredita que isso é um erro.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={() => navigate("/dashboard")} className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Ir para o Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
