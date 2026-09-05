import { useCallback, useMemo, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import ComparativoIBGE from '../components/ComparativoIBGE';
import IndicadoresSociais from '../components/IndicadoresSociais';
import { useCidadeDoUsuario } from '../hooks/useCidadeDoUsuario';

// Paleta categórica validada para daltonismo e contraste.
// A identidade segue a coluna, nunca a posição no ranking.
const COR_A = '#e56f00';
const COR_B = '#1d6fd0';

export default function Comparativos() {
  // A cidade do cadastro alimenta o atalho "usar minha cidade" e serve de
  // ponto de partida do lado esquerdo — mas os dois lados são livres.
  const { cidade: minhaCidade, resolvida } = useCidadeDoUsuario();

  const [a, setA] = useState(null);
  const [b, setB] = useState(null);

  // Enquanto o cidadão não escolher, o lado A é a cidade dele e o B fica
  // vazio até o seletor sugerir o primeiro município do estado.
  const ladoAUf = a?.uf ?? minhaCidade.uf;
  const ladoAId = a?.id ?? minhaCidade.id;
  const ladoBUf = b?.uf ?? minhaCidade.uf;
  const ladoBId = b?.id ?? '';

  const [nomes, setNomes] = useState({ a: null, b: null });

  // useCallback porque os filhos avisam o nome dentro de um efeito: sem isso
  // a função mudaria a cada render e o efeito rodaria sem parar.
  const aoCarregarNomeA = useCallback((nome) => {
    setNomes((atual) => (atual.a === nome ? atual : { ...atual, a: nome }));
  }, []);
  const aoCarregarNomeB = useCallback((nome) => {
    setNomes((atual) => (atual.b === nome ? atual : { ...atual, b: nome }));
  }, []);
  const aoCarregarNomes = useMemo(
    () => ({ a: aoCarregarNomeA, b: aoCarregarNomeB }),
    [aoCarregarNomeA, aoCarregarNomeB]
  );

  const ladoA = {
    uf: ladoAUf,
    id: ladoAId,
    aoTrocarUf: (uf) => setA({ uf, id: ladoAId }),
    aoTrocarMunicipio: (id) => setA({ uf: ladoAUf, id }),
    aoUsarMinhaCidade: () => setA({ uf: minhaCidade.uf, id: minhaCidade.id }),
  };

  const ladoB = {
    uf: ladoBUf,
    id: ladoBId,
    aoTrocarUf: (uf) => setB({ uf, id: ladoBId }),
    aoTrocarMunicipio: (id) => setB({ uf: ladoBUf, id }),
    aoUsarMinhaCidade: () => setB({ uf: minhaCidade.uf, id: minhaCidade.id }),
  };

  const cidades = [
    { id: ladoAId, nome: nomes.a ?? `${minhaCidade.nome}/${minhaCidade.uf}`, cor: COR_A },
    ...(ladoBId ? [{ id: ladoBId, nome: nomes.b ?? 'Município comparado', cor: COR_B }] : []),
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-10 pb-28 sm:px-6">
        <PageHeader
          title="Comparativo entre municípios"
          description="Escolha duas cidades e compare os dados oficiais do IBGE lado a lado."
        />

        {/* Só monta depois de saber a cidade do cidadão: o seletor escolhe
            sozinho o primeiro município do estado, e se fizesse isso antes
            travaria na UF errada. */}
        {!resolvida ? (
          <div className="mt-8 flex h-40 items-center justify-center rounded-[var(--radius-card)] border border-ink-200 bg-surface shadow-raised">
            <Loader2 size={20} className="animate-spin text-ink-500" aria-hidden="true" />
            <span className="sr-only">Carregando sua cidade</span>
          </div>
        ) : (
          <ComparativoIBGE
            ladoA={ladoA}
            ladoB={ladoB}
            cidadeDoUsuario={minhaCidade}
            aoCarregarNomes={aoCarregarNomes}
          />
        )}

        <h2 className="mt-10 font-display text-base font-bold text-ink-900">
          Indicadores sociais
        </h2>
        <p className="measure mt-1 text-sm leading-relaxed text-ink-600">
          Saneamento, educação e renda das duas cidades escolhidas acima,
          consultados no painel Cidades do IBGE — que reúne Censo 2022, INEP e
          Cadastro Central de Empresas.
        </p>

        <IndicadoresSociais cidades={cidades} />

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
          <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
          Cada indicador aparece na própria escala: percentuais (0 a 100), IDEB
          (0 a 10) e salário médio (em pisos) não são comparáveis entre si num
          mesmo eixo.
        </p>
      </main>
    </div>
  );
}
