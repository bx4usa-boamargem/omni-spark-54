import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OmniseenLogo } from "@/components/ui/OmniseenLogo";

export default function PublicLanding() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OmniseenLogo className="h-7 w-auto" />
            <span className="font-semibold text-foreground">OmniSeen</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-14">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Gere conteúdo SEO com IA, do zero ao artigo pronto.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            OmniSeen é a plataforma de geração de artigos e páginas com pipeline automatizado.
            Sem configuração de APIs por cliente.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Criar conta</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3 text-left">
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <div className="font-semibold text-foreground">Geração com pipeline</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Jobs, etapas, progresso e persistência do artigo ao final.
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <div className="font-semibold text-foreground">SEO intelligence</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Estrutura, intenção, entidades e qualidade de conteúdo.
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <div className="font-semibold text-foreground">Plataforma global</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Infra interna (Gemini/Search/Maps/Places) operando sem setup do usuário final.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

