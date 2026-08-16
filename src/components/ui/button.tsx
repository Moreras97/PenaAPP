import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "teal" | "yellow";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function Button({ className, variant = "primary", size = "md", fullWidth, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold transition-colors rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
    secondary: "bg-[var(--bg-dark)] text-white hover:bg-slate-800",
    outline: "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-page)]",
    ghost: "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-page)]",
    danger: "bg-red-600 text-white hover:bg-red-700",
    teal: "bg-[var(--color-teal)] text-white hover:opacity-90",
    yellow: "bg-[var(--color-yellow)] text-[var(--text-primary)] hover:opacity-90",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)} {...props} />
  );
}
