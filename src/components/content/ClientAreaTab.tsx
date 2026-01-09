import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Share2, Copy, CheckCircle, XCircle, Clock, ExternalLink, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ClientAreaTabProps {
  blogId: string;
}

interface ClientReview {
  id: string;
  article_id: string;
  share_token: string;
  client_name: string | null;
  client_email: string | null;
  status: string;
  comments: unknown;
  created_at: string;
  reviewed_at: string | null;
  articles?: {
    title: string;
  } | null;
}

export function ClientAreaTab({ blogId }: ClientAreaTabProps) {
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [blogId]);

  async function fetchReviews() {
    if (!blogId) return;

    const { data, error } = await supabase
      .from("client_reviews")
      .select(`
        *,
        articles (
          title
        )
      `)
      .eq("blog_id", blogId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
    } else {
      setReviews(data || []);
    }
    setLoading(false);
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/review/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-warning/30 text-warning bg-warning/10">
            <Clock className="h-3 w-3 mr-1" />
            Aguardando revisão
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="border-success/30 text-success bg-success/10">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10">
            <XCircle className="h-3 w-3 mr-1" />
            Reprovado
          </Badge>
        );
      default:
        return null;
    }
  };

  const pendingCount = reviews.filter(r => r.status === "pending").length;
  const approvedCount = reviews.filter(r => r.status === "approved").length;
  const rejectedCount = reviews.filter(r => r.status === "rejected").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Área do Cliente</h3>
              <p className="text-sm text-muted-foreground">
                Compartilhe artigos com seus clientes para revisão e aprovação. 
                Eles poderão comentar e aprovar ou reprovar o conteúdo através de um link exclusivo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/20">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Aguardando</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/20">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Aprovados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/20">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Reprovados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Revisões Enviadas</CardTitle>
          <CardDescription>
            Artigos compartilhados com clientes para revisão
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <Share2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma revisão enviada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Para enviar um artigo para revisão, acesse o editor do artigo e clique em 
                "Enviar para revisão do cliente".
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium truncate">
                        {review.articles?.title || "Artigo"}
                      </h4>
                      {getStatusBadge(review.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Enviado em {format(new Date(review.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {review.client_name && (
                        <span>• Para: {review.client_name}</span>
                      )}
                      {review.comments && Array.isArray(review.comments) && review.comments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {review.comments.length} comentário(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(review.share_token)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`/review/${review.share_token}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
