import { cn } from "@/lib/utils";

interface BlockProps {
  children: React.ReactNode;
  className?: string;
}

export const InsightBlock = ({ children, className }: BlockProps) => (
  <div className={cn(
    "bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-4 rounded-r-lg my-4",
    className
  )}>
    <span className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
      💡 Verdade Dura
    </span>
    <p className="text-purple-900 dark:text-purple-200 mt-1">{children}</p>
  </div>
);

export const AlertBlock = ({ children, className }: BlockProps) => (
  <div className={cn(
    "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg my-4",
    className
  )}>
    <span className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
      ⚠️ Atenção
    </span>
    <p className="text-red-900 dark:text-red-200 mt-1">{children}</p>
  </div>
);

export const TipBlock = ({ children, className }: BlockProps) => (
  <div className={cn(
    "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg my-4",
    className
  )}>
    <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
      📌 Dica
    </span>
    <p className="text-blue-900 dark:text-blue-200 mt-1">{children}</p>
  </div>
);

export const QuoteBlock = ({ children, className }: BlockProps) => (
  <blockquote className={cn(
    "border-l-4 border-primary pl-4 py-2 my-4 bg-primary/5 rounded-r-lg italic text-muted-foreground",
    className
  )}>
    {children}
  </blockquote>
);

export const ChecklistBlock = ({ items }: { items: string[] }) => (
  <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-lg my-4">
    <span className="font-bold text-green-700 dark:text-green-400 mb-2 block">✅ Checklist</span>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-green-900 dark:text-green-200">
          <span className="text-green-500">✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

// Helper to detect and parse block type from text
export const parseBlockType = (line: string): { type: string; content: string } | null => {
  const trimmed = line.trim();
  
  if (trimmed.startsWith('💡 ')) {
    return { type: 'insight', content: trimmed.slice(3) };
  }
  if (trimmed.startsWith('⚠️ ')) {
    return { type: 'alert', content: trimmed.slice(3) };
  }
  if (trimmed.startsWith('📌 ')) {
    return { type: 'tip', content: trimmed.slice(3) };
  }
  if (trimmed.startsWith('> ')) {
    return { type: 'quote', content: trimmed.slice(2) };
  }
  
  return null;
};
