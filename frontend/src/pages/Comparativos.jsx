import Navbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import { Info } from 'lucide-react';

// Paleta categórica validada para daltonismo e contraste.
// A identidade segue a entidade, nunca a posição no ranking.
const ENTIDADES = [
  { chave: 'taubate', nome: 'Taubaté/SP', cor: '#e56f00' },
  { chave: 'estado', nome: 'Estado de SP', cor: '#1d6fd0' },
  { chave: 'nacional', nome: 'Média nacional', cor: '#b0157a' },
];

// Cada indicador tem a PRÓPRIA escala. Colocar saneamento (0–100%) e IDEB
// (0–10) no mesmo eixo achataria o segundo até sumir — foi o que acontecia
// no gráfico anterior.
const INDICADORES = [
  {
    titulo: 'Saneamento básico',
    descricao: 'Domicílios com acesso à rede de água tratada',
    maximo: 100,
    formatar: (v) => `${v}%`,
    valores: { taubate: 98, estado: 95, nacional: 84 },
  },
  {
    titulo: 'IDEB — anos finais',
    descricao: 'Índice de Desenvolvimento da Educação Básica (0 a 10)',
    maximo: 10,
    formatar: (v) => v.toFixed(1),
    valores: { taubate: 7.2, estado: 6.5, nacional: 5.8 },
  },
  {
    titulo: 'Desenvolvimento humano',
    descricao: 'IDHM — Índice de Desenvolvimento Humano Municipal (0 a 1)',
    maximo: 1,
    formatar: (v) => v.toFixed(3).replace('.', ','),
    valores: { taubate: 0.8, estado: 0.82, nacional: 0.76 },
  },
];

function Painel({ titulo, descricao, maximo, formatar, valores }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 shadow-raised sm:p-6">
      <h3 className="font-display text-base font-bold text-ink-900">{titulo}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{descricao}</p>

      <div className="mt-5 space-y-3.5">
        {ENTIDADES.map((entidade) => {
          const valor = valores[entidade.chave];
          const proporcao = Math.max(0, Math.min(1, valor / maximo));

          return (
            <div key={entidade.chave} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3">
              <span className="truncate text-xs font-medium text-ink-600">{entidade.nome}</span>

              {/* Trilho recessivo; a barra carrega o dado */}
              <span className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                <span
                  className="block h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${proporcao * 100}%`, backgroundColor: entidade.cor }}
                />
              </span>

              {/* Rótulo direto: o valor nunca depende só da cor */}
              <span className="tabular text-right text-sm font-semibold text-ink-900">
                {formatar(valor)}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function Comparativos() {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-10 pb-28 sm:px-6">
        <PageHeader
          title="Comparativo regional e nacional"
          description="Como Taubaté se posiciona em relação ao Estado de São Paulo e à média do Brasil."
        />

        {/* Legenda: a identidade das entidades, presente antes dos dados */}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          {ENTIDADES.map((entidade) => (
            <span key={entidade.chave} className="flex items-center gap-2 text-xs font-medium text-ink-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entidade.cor }}
                aria-hidden="true"
              />
              {entidade.nome}
            </span>
          ))}
        </div>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          {INDICADORES.map((indicador) => (
            <Painel key={indicador.titulo} {...indicador} />
          ))}
        </section>

        {/* Mesma informação em tabela, para leitores de tela e comparação exata */}
        <details className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-surface shadow-raised">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-050">
            Ver os dados em tabela
          </summary>
          <div className="overflow-x-auto border-t border-ink-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-050 text-left">
                  <th scope="col" className="px-5 py-3 font-semibold text-ink-700">Indicador</th>
                  {ENTIDADES.map((e) => (
                    <th key={e.chave} scope="col" className="px-5 py-3 text-right font-semibold text-ink-700">
                      {e.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {INDICADORES.map((indicador) => (
                  <tr key={indicador.titulo}>
                    <th scope="row" className="px-5 py-3 text-left font-medium text-ink-800">
                      {indicador.titulo}
                    </th>
                    {ENTIDADES.map((e) => (
                      <td key={e.chave} className="tabular px-5 py-3 text-right text-ink-900">
                        {indicador.formatar(indicador.valores[e.chave])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
          <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
          Cada indicador é exibido na própria escala: percentuais, IDEB (0 a 10) e
          IDHM (0 a 1) não são comparáveis entre si num mesmo eixo.
        </p>
      </main>
    </div>
  );
}
