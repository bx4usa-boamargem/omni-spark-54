interface PreviewHeroProps {
  name: string;
  description: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export function PreviewHero({ name, description, primaryColor, secondaryColor }: PreviewHeroProps) {
  return (
    <div 
      className="px-4 py-6 text-center"
      style={{ 
        background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)`
      }}
    >
      <h2 
        className="font-display font-bold text-base mb-1"
        style={{ color: primaryColor }}
      >
        {name}
      </h2>
      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs mx-auto">
          {description}
        </p>
      )}
    </div>
  );
}
