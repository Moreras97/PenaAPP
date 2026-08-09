import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="bg-[var(--bg-surface)] border-brutalist shadow-brutalist rounded-[var(--radius-lg)] p-5 mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-extrabold lowercase">{title}</h2>
        {description && <p className="text-sm mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
