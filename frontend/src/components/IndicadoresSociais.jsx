import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { obterIndicadoresSociais } from '../api/dadosPublicosService';

// Indicadores sociais reais do IBGE, comparando municípios.
//
// Antes esta seção usava números inventados. Agora vem do painel Cidades do
// IBGE, que consolida por município dados de origens diferentes: o Censo
// 2022 (esgotamento e escolarização), o INEP (IDEB) e o Cadastro Central de
// Empresas (salário médio).
//
// Cada indicador tem a PRÓPRIA escala. Percentual (0–100), IDEB (0–10) e
// salário em pisos (0–10) num eixo só achatariam os dois últimos até sumir.

const formatar = (valor, unidade) => {
  if (valor == null) return '—';
  const n = Number(valor);
  if (unidade === '%') return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  if (unidade === 'salários mínimos') {
    return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sal.`;
  }
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

function useSociais(idIbge) {
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!idIbge) return undefined;
    let ativo = true;
    obterIndicadoresSociais(idIbge)
      .then((d) => ativo && setResultado({ paraId: idIbge, dados: d }))
      .catch(() => ativo && setResultado({ paraId: idIbge, dados: null }));
    return () => {
      ativo = false;
    };
  }, [idIbge]);

  // Sem id (a tela de Indicadores passa uma cidade só, então o segundo hook
  // fica vazio) não há o que carregar nem o que mostrar.
  if (!idIbge) return { carregando: false, dados: null };

  const carregando = resultado?.paraId !== idIbge;
  return { carregando, dados: carregando ? null : resultado.dados };
}

function Barra({ nome, cor, valor, maximo, unidade }) {
  const proporcao = valor == null ? 0 : Math.max(0, Math.min(1, Number(valor) / maximo));

  return (
    <div className="grid grid-cols-[10.5rem_1fr_4.5rem] items-center gap-3">
      <span className="truncate text-xs font-medium text-ink-600" title={nome}>
        {nome}
      </span>
      {/* Trilho recessivo; a barra carrega o dado */}
      <span className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
        <span
          className="block h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${proporcao * 100}%`, backgroundColor: cor }}
        />
      </span>
      {/* Rótulo direto: o valor nunca depende só da cor */}
      <span className="tabular text-right text-sm font-semibold text-ink-900">
        {formatar(valor, unidade)}
      </span>
    </div>
  );
}

export default function IndicadoresSociais({ cidades }) {
  // cidades: [{ id, nome, cor }] — a ordem define a leitura
  const a = useSociais(cidades[0]?.id);
  const b = useSociais(cidades[1]?.id);
  const consultas = [a, b];

  // Só interessa o estado das consultas que correspondem a cidades reais.
  const carregando = cidades.some((_, i) => consultas[i]?.carregando);
  const base = a.dados ?? b.dados;

  if (carregando && !base) {
    return (
      <div className="mt-5 flex h-32 items-center justify-center rounded-[var(--radius-card)] border border-ink-200 bg-surface shadow-raised">
        <Loader2 size={20} className="animate-spin text-ink-500" aria-hidden="true" />
        <span className="sr-only">Carregando indicadores sociais</span>
      </div>
    );
  }

  if (!base) {
    return (
      <p className="mt-5 rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 text-sm text-ink-600 shadow-raised">
        Não foi possível consultar os indicadores sociais do IBGE agora.
      </p>
    );
  }

  return (
    <>
      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        {base.indicadores.map((def, indice) => (
          <article
            key={def.chave}
            className="rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 shadow-raised"
          >
            <h3 className="font-display text-base font-bold text-ink-900">{def.nome}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              {def.unidade === '%'
                ? 'Percentual de 0 a 100'
                : def.unidade === 'salários mínimos'
                  ? 'Em salários mínimos'
                  : 'Nota de 0 a 10'}
              {def.ano ? ` · referência ${def.ano}` : ''}
            </p>

            <div className="mt-5 space-y-3.5">
              {cidades.map((cidade, i) => {
                const dados = consultas[i]?.dados;
                const achado = dados?.indicadores?.[indice];
                return (
                  <Barra
                    key={cidade.id}
                    nome={cidade.nome}
                    cor={cidade.cor}
                    valor={achado?.valor}
                    maximo={def.maximo}
                    unidade={def.unidade}
                  />
                );
              })}
            </div>
          </article>
        ))}
      </section>

      {/* Mesma informação em tabela, para leitores de tela e comparação exata */}
      <details className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-surface shadow-raised">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-050">
          Ver os dados em tabela
        </summary>
        <div className="overflow-x-auto border-t border-ink-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-050 text-left">
                <th scope="col" className="px-5 py-3 font-semibold text-ink-700">Indicador</th>
                <th scope="col" className="px-5 py-3 font-semibold text-ink-700">Ano</th>
                {cidades.map((c) => (
                  <th key={c.id} scope="col" className="px-5 py-3 text-right font-semibold text-ink-700">
                    {c.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {base.indicadores.map((def, indice) => (
                <tr key={def.chave}>
                  <th scope="row" className="px-5 py-3 text-left font-medium text-ink-800">
                    {def.nome}
                  </th>
                  <td className="tabular px-5 py-3 text-ink-600">{def.ano ?? '—'}</td>
                  {cidades.map((cidade, i) => {
                    const achado = consultas[i]?.dados?.indicadores?.[indice];
                    return (
                      <td key={cidade.id} className="tabular px-5 py-3 text-right text-ink-900">
                        {formatar(achado?.valor, def.unidade)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        Fonte: {base.fonte}. Os anos de referência diferem porque as pesquisas
        de origem têm calendários próprios.
      </p>
    </>
  );
}
