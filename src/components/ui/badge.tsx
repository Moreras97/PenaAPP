import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger";
}

const variants = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span className={cn("inline-flex px-2 py-0.5 text-xs font-medium rounded-full", variants[variant], className)} {...props} />
  );
}
