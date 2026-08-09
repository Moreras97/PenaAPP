import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)] border-brutalist shadow-brutalist p-6 rounded-[var(--radius-lg)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("pb-4 mb-4 border-b-2 border-[var(--border-color)]", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFlat({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)] border-brutalist rounded-[var(--radius-lg)] p-6",
        className
      )}
      {...props}
    />
  );
}
