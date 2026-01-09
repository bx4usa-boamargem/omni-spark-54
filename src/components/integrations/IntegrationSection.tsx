import { ReactNode } from "react";

interface IntegrationSectionProps {
  title: string;
  description: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function IntegrationSection({
  title,
  description,
  icon,
  children,
}: IntegrationSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        {icon && <div className="text-primary">{icon}</div>}
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}
