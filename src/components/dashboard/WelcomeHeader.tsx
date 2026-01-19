import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface WelcomeHeaderProps {
  userName: string | null | undefined;
  blogName: string | null | undefined;
  onCreateArticle: () => void;
}

export function WelcomeHeader({ userName, blogName, onCreateArticle }: WelcomeHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Bem-vindo, {userName || 'Usuário'}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">{blogName || 'Sua empresa'}</p>
      </div>
      <Button 
        onClick={onCreateArticle} 
        className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg shadow-orange-500/25"
      >
        <Sparkles className="h-4 w-4" />
        Gerar Artigo
      </Button>
    </div>
  );
}
