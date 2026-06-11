import { X } from 'lucide-react';
import StatusMessage from './StatusMessage';

export default function Toast({ notification, onClose }) {
  if (!notification) return null;

  return (
    <div className="fixed top-20 right-4 z-[60] max-w-sm w-[calc(100%-2rem)] sm:w-full animate-fade-in">
      <div className="relative shadow-lg rounded-xl">
        <StatusMessage type={notification.type} message={notification.message} />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fechar notificação"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
