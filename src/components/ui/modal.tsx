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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative bg-[var(--bg-surface)] rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] max-w-lg w-full sm:mx-4 max-h-[90vh] overflow-auto z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] sticky top-0 bg-[var(--bg-surface)]">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full hover:bg-[var(--bg-page)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
