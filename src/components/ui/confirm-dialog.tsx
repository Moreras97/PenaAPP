"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {description && <p className="mb-5">{description}</p>}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
