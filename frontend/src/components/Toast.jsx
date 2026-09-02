import { X } from 'lucide-react';
import StatusMessage from './StatusMessage';

export default function Toast({ notification, onClose }) {
  if (!notification) return null;

  return (
    <div className="surface-in fixed right-4 top-20 z-[60] w-[calc(100%-2rem)] max-w-sm sm:w-full">
      <div className="relative rounded-[var(--radius-field)] bg-surface shadow-overlay">
        <StatusMessage type={notification.type} message={notification.message} />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded p-1 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-label="Fechar notificação"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
