import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  primaryColor?: string;
  articleCounts?: Record<string, number>;
}

export const CategoryFilter = ({
  categories,
  activeCategory,
  onCategoryChange,
  primaryColor = "#6366f1",
  articleCounts = {},
}: CategoryFilterProps) => {
  if (categories.length === 0) return null;

  const totalArticles = Object.values(articleCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="w-full mb-8">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 pb-2">
          {/* "All" filter button */}
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              activeCategory === null
                ? "text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
            style={
              activeCategory === null
                ? { backgroundColor: primaryColor }
                : undefined
            }
          >
            Todos
            {totalArticles > 0 && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                activeCategory === null 
                  ? "bg-white/20 text-white" 
                  : "bg-gray-200 text-gray-600"
              )}>
                {totalArticles}
              </span>
            )}
          </button>

          {/* Category filter buttons */}
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                activeCategory === category
                  ? "text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
              style={
                activeCategory === category
                  ? { backgroundColor: primaryColor }
                  : undefined
              }
            >
              {category}
              {articleCounts[category] !== undefined && articleCounts[category] > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  activeCategory === category 
                    ? "bg-white/20 text-white" 
                    : "bg-gray-200 text-gray-600"
                )}>
                  {articleCounts[category]}
                </span>
              )}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
};
