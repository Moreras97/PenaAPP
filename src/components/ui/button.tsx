import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition disabled:opacity-50";
  const variants = {
    primary: "bg-[var(--color-primary)] text-white hover:opacity-90",
    secondary: "bg-[var(--color-secondary)] text-white hover:opacity-90",
    outline: "border border-gray-300 hover:bg-gray-50",
    ghost: "hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2", lg: "px-6 py-3 text-lg" };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}
