import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-10 px-4">
      {icon && <div className="mx-auto w-14 h-14 rounded-full bg-[var(--bg-page)] flex items-center justify-center text-[var(--text-secondary)] mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
