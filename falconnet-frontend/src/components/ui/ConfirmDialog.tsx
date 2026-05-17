'use client';

import { useState } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Show confirm button in red */
  danger?: boolean;
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText  = 'Cancelar',
  danger      = false,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
        {message}
      </p>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          size="sm"
          loading={loading}
          onClick={handleConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
}

export { ConfirmDialog };
