import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "teal" | "yellow";
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center font-bold transition-all duration-100 border-brutalist shadow-brutalist-sm press-down disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-[var(--color-primary)] text-white border-[var(--color-primary)]",
    secondary: "bg-[var(--color-lavender)] text-[var(--text-primary)] border-[var(--color-lavender)]",
    outline: "bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-page)]",
    ghost: "bg-transparent text-[var(--text-primary)] border-transparent shadow-none hover:bg-[var(--bg-page)] hover:border-[var(--border-color)] hover:shadow-brutalist-sm",
    danger: "bg-[var(--color-primary)] text-white border-[var(--color-primary)]",
    teal: "bg-[var(--color-teal)] text-[var(--text-primary)] border-[var(--color-teal)]",
    yellow: "bg-[var(--color-yellow)] text-[var(--text-primary)] border-[var(--color-yellow)]",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-[var(--radius-sm)]",
    md: "px-5 py-2.5 text-base rounded-[var(--radius-md)]",
    lg: "px-7 py-3.5 text-lg rounded-[var(--radius-md)]",
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}
