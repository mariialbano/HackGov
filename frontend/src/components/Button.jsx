import { Loader2 } from 'lucide-react';

// Botão do sistema de design.
// Concentra em um só lugar altura, tipografia, foco acessível, estado
// desabilitado e carregando — para nenhuma tela reinventar o próprio botão.

const variantes = {
  primary:
    'bg-brand text-on-brand shadow-raised hover:bg-brand-strong active:translate-y-px',
  secondary:
    'bg-surface text-ink-800 border border-ink-200 shadow-raised hover:border-ink-300 hover:bg-ink-050',
  positive:
    'bg-positive text-on-fill shadow-raised hover:brightness-95 active:translate-y-px',
  ghost:
    'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger:
    'bg-surface text-danger-ink border border-danger/30 hover:bg-danger-soft hover:border-danger/50',
};

const tamanhos = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center rounded-[var(--radius-field)] font-semibold',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-150',
        'disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none',
        variantes[variant],
        tamanhos[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin shrink-0" aria-hidden="true" />
      ) : (
        Icon && <Icon size={16} className="shrink-0" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
