import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "primary" | "teal";
}

const variants = {
  default: "bg-[var(--bg-dark)] text-[var(--text-on-dark)]",
  success: "bg-[var(--color-teal)] text-[var(--text-primary)]",
  warning: "bg-[var(--color-yellow)] text-[var(--text-primary)]",
  danger: "bg-[var(--color-primary)] text-white",
  primary: "bg-[var(--color-lavender)] text-[var(--text-primary)]",
  teal: "bg-[var(--color-teal)] text-[var(--text-primary)]",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex px-3 py-1 text-xs font-bold border-brutalist shadow-brutalist-sm rounded-[var(--radius-pill)]",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
