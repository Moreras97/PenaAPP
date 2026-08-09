"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[var(--bg-dark)]/60" onClick={onClose} />
      <div className="relative bg-[var(--bg-surface)] border-brutalist shadow-brutalist-lg rounded-[var(--radius-lg)] max-w-lg w-full mx-4 max-h-[90vh] overflow-auto z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[var(--border-color)]">
          <h2 className="text-xl font-bold lowercase">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-page)] rounded-[var(--radius-sm)] press-down">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
