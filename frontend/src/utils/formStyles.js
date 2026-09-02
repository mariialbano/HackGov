// Estilos compartilhados pelos controles de formulário (input, select,
// textarea). Ficam fora do componente para que o arquivo do FormField
// exporte apenas o componente.

export const controlClass =
  'w-full rounded-[var(--radius-field)] border bg-surface px-3.5 py-2.5 text-sm text-ink-900 ' +
  'placeholder:text-ink-500 transition-colors duration-150 ' +
  'focus:outline-none focus-visible:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15 ' +
  'disabled:cursor-not-allowed disabled:bg-ink-050 disabled:text-ink-500';

export function fieldBorder(hasError) {
  return hasError ? 'border-danger/60' : 'border-ink-200 hover:border-ink-300';
}
