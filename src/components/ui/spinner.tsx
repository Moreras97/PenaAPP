import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-[var(--bg-page)]", className)}>
      <div className="w-8 h-8 border-2 border-[var(--border-color)] border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );
}
