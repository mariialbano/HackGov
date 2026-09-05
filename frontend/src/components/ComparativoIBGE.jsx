import { useEffect, useState } from 'react';
import { Database, Loader2, MapPin } from 'lucide-react';
import { obterIndicadoresMunicipio } from '../api/dadosPublicosService';
import SeletorMunicipio from './SeletorMunicipio';

// Comparação com dados REAIS do IBGE.
//
// Nenhuma base pública divulga indicadores por bairro, então a comparação
// honesta é entre municípios. Os dois lados são escolhidos livremente, e um
// atalho traz a cidade do CEP cadastrado no perfil.

const moeda = (valor) => {
  if (valor == null) return '—';
  if (valor >= 1_000_000_000_000) {
    return `R$ ${(valor / 1_000_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} tri`;
  }
  if (valor >= 1_000_000_000) {
    return `R$ ${(valor / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`;
  }
  return `R$ ${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
};

const numero = (valor) => (valor == null ? '—' : valor.toLocaleString('pt-BR'));

const CLASSE_SELECT =
  'rounded-lg border border-ink-300 bg-surface px-2.5 py-1.5 font-display text-sm font-bold text-ink-900 outline-none focus:border-brand';

function Dados({ dados, carregando }) {
  if (carregando) {
    return (
      <div className="flex min-h-[7.5rem] items-center justify-center">
        <Loader2 size={18} className="animate-spin text-ink-500" aria-hidden="true" />
        <span className="sr-only">Carregando dados do IBGE</span>
      </div>
    );
  }

  if (!dados) {
    return (
      <p className="py-6 text-center text-xs text-ink-500">
        Não foi possível carregar este município agora.
      </p>
    );
  }

  return (
    <dl className="space-y-4">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          População {dados.populacaoAno ? `(${dados.populacaoAno})` : ''}
        </dt>
        <dd className="tabular mt-0.5 font-display text-xl font-bold text-ink-900">
          {numero(dados.populacao)}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          PIB {dados.pibAno ? `(${dados.pibAno})` : ''}
        </dt>
        <dd className="tabular mt-0.5 font-display text-xl font-bold text-ink-900">
          {moeda(dados.pibReais)}
        </dd>
      </div>
    </dl>
  );
}

/** Uma coluna da comparação: seletor próprio, atalho e os números. */
function Lado({ lado, cidadeDoUsuario, idBase, destaque, aoCarregar }) {
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!lado.id) return undefined;
    let ativo = true;
    obterIndicadoresMunicipio(lado.id)
      .then((dados) => ativo && setResultado({ paraId: lado.id, dados }))
      .catch(() => ativo && setResultado({ paraId: lado.id, dados: null }));
    return () => {
      ativo = false;
    };
  }, [lado.id]);

  const carregando = resultado?.paraId !== lado.id;
  const dados = carregando ? null : resultado.dados;

  // A página usa o mesmo nome nos indicadores sociais logo abaixo.
  useEffect(() => {
    aoCarregar(dados?.municipio ?? null);
  }, [dados, aoCarregar]);

  const eMinhaCidade =
    cidadeDoUsuario.doCadastro && String(cidadeDoUsuario.id) === String(lado.id);

  return (
    <div
      className={[
        'rounded-xl border p-4',
        destaque ? 'border-brand-line bg-brand-soft/40' : 'border-ink-200',
      ].join(' ')}
    >
      <SeletorMunicipio
        uf={lado.uf}
        municipioId={lado.id}
        aoTrocarUf={lado.aoTrocarUf}
        aoTrocarMunicipio={lado.aoTrocarMunicipio}
        idBase={idBase}
        classeSelect={CLASSE_SELECT}
      />

      {/* Atalho para a cidade do cadastro. Vira aviso quando já é ela. */}
      {cidadeDoUsuario.doCadastro && !eMinhaCidade && (
        <button
          type="button"
          onClick={lado.aoUsarMinhaCidade}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-brand-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-soft"
        >
          <MapPin size={12} aria-hidden="true" />
          Usar minha cidade ({cidadeDoUsuario.nome})
        </button>
      )}
      {eMinhaCidade && (
        <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
          <MapPin size={12} aria-hidden="true" />
          Sua cidade, pelo CEP do cadastro
        </p>
      )}

      <div className="mt-4">
        <Dados dados={dados} carregando={carregando} />
      </div>
    </div>
  );
}

export default function ComparativoIBGE({ ladoA, ladoB, cidadeDoUsuario, aoCarregarNomes }) {
  return (
    <section className="mt-8 rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 shadow-raised sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-info-soft text-info-ink">
          <Database size={17} aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold text-ink-900">
            Dados oficiais do IBGE
          </h2>
          <p className="text-xs text-ink-500">Consultados ao vivo, não são estimativas nossas.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Lado
          lado={ladoA}
          cidadeDoUsuario={cidadeDoUsuario}
          idBase="comparativo-a"
          destaque
          aoCarregar={aoCarregarNomes.a}
        />
        <Lado
          lado={ladoB}
          cidadeDoUsuario={cidadeDoUsuario}
          idBase="comparativo-b"
          destaque={false}
          aoCarregar={aoCarregarNomes.b}
        />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        Fonte: IBGE — Estimativas de População (tabela 6579) e PIB dos Municípios
        (tabela 5938). Cada indicador traz o ano de referência porque as duas
        pesquisas não são publicadas no mesmo ritmo.
      </p>
    </section>
  );
}
