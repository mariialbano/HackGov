import { Flag } from 'lucide-react';

// Selo de prioridade do protocolo, exibido apenas ao atendente.
// Como no StatusBadge, a cor nunca comunica sozinha: o nível vai escrito.

const estilos = {
  Alta: 'bg-danger-soft text-danger-ink border-danger/30',
  Média: 'bg-brand-soft text-brand-ink border-brand/30',
  Baixa: 'bg-ink-100 text-ink-600 border-ink-200',
};

export default function PrioridadeBadge({ nivel }) {
  if (!nivel) return null;

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
        'text-xs font-semibold whitespace-nowrap',
        estilos[nivel] ?? estilos.Baixa,
      ].join(' ')}
    >
      <Flag size={11} aria-hidden="true" />
      Prioridade {nivel.toLowerCase()}
    </span>
  );
}
