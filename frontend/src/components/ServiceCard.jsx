import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Item de serviço do painel inicial.
// A seta só aparece no hover: o cartão em repouso fica limpo, e o convite
// à ação surge quando o cursor confirma a intenção.

export default function ServiceCard({ title, desc, icon: Icon, path }) {
  return (
    <Link
      to={path}
      className="group flex items-start gap-4 rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 shadow-raised transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-line hover:shadow-lifted"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-brand-ink transition-colors duration-200 group-hover:bg-brand group-hover:text-on-brand">
        <Icon size={20} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="font-display text-[0.95rem] font-bold text-ink-900">{title}</span>
          <ArrowRight
            size={14}
            className="shrink-0 text-brand opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
            aria-hidden="true"
          />
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-ink-600">{desc}</span>
      </span>
    </Link>
  );
}
