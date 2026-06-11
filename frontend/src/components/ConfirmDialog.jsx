import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
}) {
  if (!isOpen) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'bg-gov-orange hover:bg-orange-600 text-white';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[70] p-4">
      <div
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-red-50 text-red-500 rounded-xl shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 id="confirm-dialog-title" className="font-bold text-gray-800 text-lg">
                {title}
              </h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 font-bold py-3 rounded-xl transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
