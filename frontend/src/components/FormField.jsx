import FieldError from './FieldError';

// Estrutura padrão de um campo: rótulo, dica, controle, contador e erro.
// Mantém o espaçamento e a hierarquia iguais em todos os formulários.

export default function FormField({ label, hint, required, error, counter, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="flex items-baseline gap-1 text-sm font-semibold text-ink-800">
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">*</span>
          )}
        </label>
      )}
      {hint && <p className="text-xs leading-relaxed text-ink-500">{hint}</p>}
      {children}
      {counter && <p className="text-right text-xs text-ink-500">{counter}</p>}
      <FieldError message={error} />
    </div>
  );
}
