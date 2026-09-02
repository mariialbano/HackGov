import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// Faixa de estado da integração com a API: carregando, sucesso ou falha.
// A cor nunca informa sozinha — o ícone e o texto carregam o significado.

const variants = {
  loading: { icon: Loader2, className: 'bg-info-soft text-info-ink border-info/25', spin: true },
  success: { icon: CheckCircle2, className: 'bg-positive-soft text-positive-ink border-positive/25', spin: false },
  error: { icon: AlertCircle, className: 'bg-danger-soft text-danger-ink border-danger/25', spin: false },
};

export default function StatusMessage({ type, message }) {
  if (!type || !message) return null;

  const variant = variants[type];
  if (!variant) return null;

  const Icon = variant.icon;

  return (
    <div
      role="status"
      className={[
        'flex items-start gap-2.5 rounded-[var(--radius-field)] border px-3.5 py-3',
        'text-sm font-medium leading-snug',
        variant.className,
      ].join(' ')}
    >
      <Icon
        size={17}
        className={variant.spin ? 'mt-px shrink-0 animate-spin' : 'mt-px shrink-0'}
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
}
