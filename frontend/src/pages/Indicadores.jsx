import { useEffect, useState } from 'react';
import { Users, Landmark, Wallet, TrendingUp, Percent, Info, MapPin, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import MapaCidade from '../components/MapaCidade';
import SeletorMunicipio from '../components/SeletorMunicipio';
import IndicadoresSociais from '../components/IndicadoresSociais';
import { controlClass, fieldBorder } from '../utils/formStyles';
import { useCidadeDoUsuario } from '../hooks/useCidadeDoUsuario';
import { obterIndicadoresMunicipio, obterIpca, obterSelic } from '../api/dadosPublicosService';

const inteiro = (v) => (v == null ? '—' : v.toLocaleString('pt-BR'));

// Percentual com vírgula decimal, como se escreve em português.
const porcento = (v) =>
  v == null ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

// Em valor monetario as casas sao fixas: "R$ 53.882,2" parece truncado.
const reais = (v, casas = 0) =>
  v == null
    ? '—'
    : `R$ ${v.toLocaleString('pt-BR', {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
      })}`;

// Valores grandes ficam ilegíveis por extenso: R$ 22.607.800.000 vira "R$ 22,6 bi".
const reaisCompacto = (v) => {
  if (v == null) return '—';
  if (v >= 1_000_000_000_000) return `R$ ${(v / 1_000_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} tri`;
  if (v >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  return reais(v);
};

function Cartao({ icon: Icon, rotulo, valor, contexto, carregando }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 shadow-raised">
      <div className="flex items-center gap-2 text-ink-500">
        <Icon size={16} aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wide">{rotulo}</p>
      </div>
      {carregando ? (
        <div className="mt-3 flex h-[2.1rem] items-center">
          <Loader2 size={18} className="animate-spin text-ink-400" aria-hidden="true" />
          <span className="sr-only">Carregando</span>
        </div>
      ) : (
        <p className="tabular mt-3 font-display text-[1.75rem] font-bold leading-none text-ink-900">
          {valor}
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-ink-500">{contexto}</p>
    </div>
  );
}

export default function Indicadores() {
  const { cidade: cidadeDoCidadao } = useCidadeDoUsuario();

  // A escolha do usuário é derivada, não sincronizada: enquanto ele não
  // trocar nada, `escolha` é null e a tela segue a cidade do cadastro.
  // Sincronizar isso por efeito causaria uma renderização em cascata.
  const [escolha, setEscolha] = useState(null);
  const uf = escolha?.uf ?? cidadeDoCidadao.uf;
  const escolhido = escolha?.id ?? cidadeDoCidadao.id;

  const trocarUf = (nova) => setEscolha({ uf: nova, id: escolhido });
  const trocarMunicipio = (id) => setEscolha({ uf, id });

  const [resultado, setResultado] = useState(null);
  const [ipca, setIpca] = useState(null);
  const [selic, setSelic] = useState(null);

  // Lista de municípios e índices nacionais: uma vez por visita.
  useEffect(() => {
    let ativo = true;
    obterIpca().then((d) => ativo && setIpca(d)).catch(() => {});
    obterSelic().then((d) => ativo && setSelic(d)).catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  // Indicadores da cidade selecionada. O resultado carrega o id a que
  // pertence, para o estado de carregamento ser derivado.
  useEffect(() => {
    let ativo = true;
    obterIndicadoresMunicipio(escolhido)
      .then((dados) => ativo && setResultado({ paraId: escolhido, dados }))
      .catch(() => ativo && setResultado({ paraId: escolhido, dados: null }));
    return () => {
      ativo = false;
    };
  }, [escolhido]);

  const carregando = resultado?.paraId !== escolhido;
  const cidade = carregando ? null : resultado.dados;

  const daSuaCidade = cidadeDoCidadao.doCadastro && String(cidadeDoCidadao.id) === String(escolhido);

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 pb-28 sm:px-6">
        <PageHeader
          title="Indicadores municipais"
          description="Situação da cidade com dados oficiais do IBGE, consultados na hora."
        >
          <SeletorMunicipio
            uf={uf}
            municipioId={escolhido}
            aoTrocarUf={trocarUf}
            aoTrocarMunicipio={trocarMunicipio}
            idBase="indicadores"
            classeSelect={`${controlClass} ${fieldBorder(false)} font-medium`}
            larguraMunicipio="sm:w-[18rem]"
          />
        </PageHeader>

        {/* Sinaliza quando o que está na tela é a cidade do próprio cidadão */}
        {daSuaCidade && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-ink">
            <MapPin size={13} aria-hidden="true" />
            Esta é a sua cidade, pelo CEP do seu cadastro
          </p>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Cartao
            icon={Users}
            rotulo="População"
            valor={inteiro(cidade?.populacao)}
            contexto={
              cidade?.populacaoAno
                ? `Estimativa do IBGE para ${cidade.populacaoAno}`
                : 'Estimativa do IBGE'
            }
            carregando={carregando}
          />
          <Cartao
            icon={Landmark}
            rotulo="PIB do município"
            valor={reaisCompacto(cidade?.pibReais)}
            contexto={
              cidade?.pibAno
                ? `Produto Interno Bruto em ${cidade.pibAno}`
                : 'Produto Interno Bruto'
            }
            carregando={carregando}
          />
          <Cartao
            icon={Wallet}
            rotulo="PIB por habitante"
            valor={cidade?.pibPorHabitante ? reais(cidade.pibPorHabitante, 2) : '—'}
            contexto={
              cidade?.pibPorHabitanteAno
                ? `PIB de ${cidade.pibPorHabitanteAno} dividido pela população de ` +
                  `${cidade.pibPorHabitantePopulacaoAno ?? cidade.pibPorHabitanteAno}` +
                  (cidade.pibPorHabitantePopulacaoAno &&
                  cidade.pibPorHabitantePopulacaoAno !== cidade.pibPorHabitanteAno
                    ? ' (o IBGE não estima população em ano de Censo)'
                    : '')
                : 'Depende de PIB e população publicados para o mesmo município'
            }
            carregando={carregando}
          />
        </section>

        {/* Contexto nacional: vale para qualquer cidade da lista */}
        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <Cartao
            icon={TrendingUp}
            rotulo="Inflação (IPCA)"
            valor={ipca ? porcento(ipca.acumulado12Meses) : '—'}
            contexto={
              ipca
                ? `Acumulado em 12 meses até ${ipca.referencia} · Banco Central`
                : 'Acumulado em 12 meses · Banco Central'
            }
            carregando={!ipca}
          />
          <Cartao
            icon={Percent}
            rotulo="Taxa Selic"
            valor={selic ? `${porcento(selic.aoAno)} a.a.` : '—'}
            contexto={
              selic
                ? `Meta definida pelo Copom em ${selic.referencia} · Banco Central`
                : 'Meta definida pelo Copom · Banco Central'
            }
            carregando={!selic}
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-surface shadow-raised">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 px-5 py-4">
            <h2 className="font-display text-base font-bold text-ink-900">
              {cidade?.municipio ?? 'Mapa da cidade'}
            </h2>
            <p className="text-xs text-ink-500">Cartografia aberta do OpenStreetMap</p>
          </div>
          <div className="h-[420px]">
            {cidade?.latitude != null ? (
              <MapaCidade
                cidade={cidade}
                indicadores={[
                  { rotulo: 'População', valor: inteiro(cidade.populacao) },
                  { rotulo: 'PIB', valor: reaisCompacto(cidade.pibReais) },
                  ...(cidade.pibPorHabitante
                    ? [{ rotulo: 'PIB/hab.', valor: reais(cidade.pibPorHabitante, 0) }]
                    : []),
                ]}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-500">
                {carregando ? 'Carregando o mapa...' : 'Mapa indisponível para este município.'}
              </div>
            )}
          </div>
        </section>

        <h2 className="mt-10 font-display text-base font-bold text-ink-900">
          Indicadores sociais
        </h2>
        <p className="measure mt-1 text-sm leading-relaxed text-ink-600">
          Saneamento, educação e renda do município, do painel Cidades do IBGE.
        </p>

        <IndicadoresSociais
          cidades={[{ id: escolhido, nome: cidade?.municipio ?? 'Município', cor: '#e56f00' }]}
        />

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
          <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
          População e PIB vêm do IBGE (tabelas 6579 e 5938); inflação e Selic, do
          Banco Central; a cartografia, do OpenStreetMap. Cada número traz o ano
          de referência porque as pesquisas não são publicadas no mesmo ritmo.
        </p>
      </main>
    </div>
  );
}
