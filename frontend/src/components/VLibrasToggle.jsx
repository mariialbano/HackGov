import { Hand } from 'lucide-react';
import { useVLibras } from '../hooks/useVLibras';

// Liga e desliga o tradutor de Libras.
// aria-pressed comunica o estado a quem usa leitor de tela — para um
// recurso de acessibilidade, o proprio controle precisa ser acessivel.
export default function VLibrasToggle() {
  const { ativo, alternar } = useVLibras();

  const titulo = ativo ? 'Desativar tradutor de Libras' : 'Ativar tradutor de Libras';

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={ativo}
      title={titulo}
      aria-label={titulo}
      className={[
        'rounded-lg p-2 transition-colors',
        ativo
          ? 'bg-info-soft text-info-ink'
          : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900',
      ].join(' ')}
    >
      <Hand size={18} aria-hidden="true" />
    </button>
  );
}
