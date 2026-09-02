import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}) {
  // Esc fecha o diálogo — expectativa básica de qualquer caixa modal.
  useEffect(() => {
    if (!isOpen) return undefined;
    const aoTeclar = (e) => e.key === 'Escape' && onCancel?.();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink-900/45 p-4 backdrop-blur-[2px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="surface-in w-full max-w-md overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-overlay"
      >
        <div className="flex items-start gap-4 p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-ink-900">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-ink-200 bg-ink-050 p-4">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            fullWidth
            onClick={onConfirm}
            className="bg-danger text-on-fill shadow-raised hover:bg-danger-ink"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
