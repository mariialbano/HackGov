import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

// Alterna entre tema claro e escuro.
// O ícone mostra o tema que será aplicado ao clicar, não o atual — é o que
// o usuário espera de um botão de ação.
export default function ThemeToggle() {
  const { alternar, escuroAtivo } = useTheme();
  const proximo = escuroAtivo ? 'claro' : 'escuro';

  return (
    <button
      type="button"
      onClick={alternar}
      className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
      title={`Mudar para o tema ${proximo}`}
      aria-label={`Mudar para o tema ${proximo}`}
    >
      {escuroAtivo ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}
