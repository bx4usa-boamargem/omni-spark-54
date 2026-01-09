import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield } from "lucide-react";

interface Blog {
  id: string;
  name: string;
  slug: string;
}

interface BlogSelectorProps {
  selectedBlogId: string | null;
  onSelectBlog: (blogId: string) => void;
}

export function BlogSelector({ selectedBlogId, onSelectBlog }: BlogSelectorProps) {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data } = await supabase
        .from("blogs")
        .select("id, name, slug")
        .order("name", { ascending: true });

      if (data) {
        setBlogs(data);
      }
    } catch (error) {
      console.error("Error fetching blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
        <Shield className="h-4 w-4 text-warning animate-pulse" />
        <span className="text-sm text-warning">Carregando blogs...</span>
      </div>
    );
  }

  const selectedBlog = blogs.find((b) => b.id === selectedBlogId);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-warning" />
        <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">
          Modo Admin
        </Badge>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Visualizando:</span>
        <Select value={selectedBlogId || undefined} onValueChange={onSelectBlog}>
          <SelectTrigger className="w-[250px] h-8">
            <SelectValue placeholder="Selecione um blog" />
          </SelectTrigger>
          <SelectContent>
            {blogs.map((blog) => (
              <SelectItem key={blog.id} value={blog.id}>
                {blog.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
