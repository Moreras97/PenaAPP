import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "primary" | "teal";
}

const variants = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]",
  teal: "bg-teal-100 text-teal-800",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-[var(--radius-pill)]",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
