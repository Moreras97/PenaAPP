import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pb-3 mb-3 border-b border-[var(--border-color)]", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFlat({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5",
        className
      )}
      {...props}
    />
  );
}
