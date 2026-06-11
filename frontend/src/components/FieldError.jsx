import { AlertCircle } from 'lucide-react';

export default function FieldError({ message }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-red-700"
    >
      <AlertCircle size={14} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}
