import { AlertCircle } from 'lucide-react';

export default function FieldError({ message }) {
  if (!message) return null;

  return (
    <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-danger-ink">
      <AlertCircle size={14} className="mt-px shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
