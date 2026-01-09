interface PreviewHeaderProps {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
}

export function PreviewHeader({ name, logoUrl, primaryColor }: PreviewHeaderProps) {
  return (
    <div 
      className="flex items-center gap-2 px-4 py-2 border-b border-border/50"
      style={{ backgroundColor: `${primaryColor}08` }}
    >
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={name} 
          className="h-5 w-5 rounded object-cover"
        />
      ) : (
        <div 
          className="h-5 w-5 rounded flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: primaryColor }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-display font-semibold text-sm text-foreground truncate">
        {name}
      </span>
    </div>
  );
}
