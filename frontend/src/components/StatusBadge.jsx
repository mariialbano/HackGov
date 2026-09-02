// Selo de status do protocolo.
// A cor comunica a etapa do fluxo, mas nunca sozinha: o rótulo textual
// sempre acompanha, para quem não distingue as cores.

const estilos = {
  33: 'bg-info-soft text-info-ink border-info/25',
  66: 'bg-brand-soft text-brand-ink border-brand/30',
  100: 'bg-positive-soft text-positive-ink border-positive/30',
};

export default function StatusBadge({ progresso, children }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
        'text-xs font-semibold whitespace-nowrap',
        estilos[progresso] ?? estilos[33],
      ].join(' ')}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {children}
    </span>
  );
}
