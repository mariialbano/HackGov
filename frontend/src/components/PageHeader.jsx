// Cabeçalho padrão das páginas internas: mesma âncora visual em todas as
// telas, com espaço para ações à direita.

export default function PageHeader({ title, description, children }) {
  return (
    <header className="flex flex-col gap-5 border-b border-ink-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-[1.75rem]">{title}</h1>
        {description && (
          <p className="measure mt-2 text-sm leading-relaxed text-ink-600">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  );
}
