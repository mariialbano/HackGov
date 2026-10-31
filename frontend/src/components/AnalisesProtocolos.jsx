import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import StatusMessage from './StatusMessage';
import { obterAnalises } from '../api/protocoloService';

// Análises estatísticas dos protocolos (só para o atendente), calculadas no
// backend em GET /protocolos/analises:
//   1. Correlação de Spearman entre prioridade e tempo de resolução;
//   2. Regressão linear do volume semanal de protocolos.
//
// Cores: barras no tom forte da marca (contraste >= 3:1 nos dois temas) e a
// tendência em tinta neutra. Ambas vêm de tokens CSS, então o tema escuro
// troca sozinho.

const COR_BARRA = 'var(--color-brand-strong)';
const COR_TENDENCIA = 'var(--color-ink-800)';
const COR_GRADE = 'var(--color-ink-200)';
const COR_TEXTO = 'var(--color-ink-500)';

const numero = (valor, casas = 2) =>
  Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

// "2026-04-06" -> "06/04" (sem passar por Date, que deslocaria o dia pelo fuso)
function diaMes(iso) {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

function dataCompleta(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function DicaDoGrafico({ active, payload }) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload;
  return (
    <div className="rounded-[var(--radius-field)] border border-ink-200 bg-surface px-3 py-2 text-xs shadow-lifted">
      <p className="font-semibold text-ink-900">Semana de {dataCompleta(ponto.semana)}</p>
      <p className="mt-1 text-ink-700">
        <span className="tabular font-semibold">{ponto.protocolos}</span>{' '}
        {ponto.protocolos === 1 ? 'protocolo aberto' : 'protocolos abertos'}
      </p>
      <p className="text-ink-600">
        Tendência: <span className="tabular">{numero(ponto.tendencia)}</span>
      </p>
    </div>
  );
}

// Escala de -1 a +1 com o rho marcado: o centro (0) é "sem relação".
function EscalaRho({ rho }) {
  const posicao = ((rho + 1) / 2) * 100;
  return (
    <div className="mt-4" aria-hidden="true">
      <div className="relative h-1.5 rounded-full bg-ink-100">
        <span className="absolute left-1/2 top-[-3px] h-3 w-px bg-ink-400" />
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand-strong"
          style={{ left: `${posicao}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[0.7rem] font-medium text-ink-500">
        <span>-1</span>
        <span>0</span>
        <span>+1</span>
      </div>
    </div>
  );
}

function BlocoSpearman({ dados }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 shadow-raised">
      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
        Prioridade × tempo de resolução
      </h3>
      <p className="mt-1 text-xs text-ink-500">Correlação de Spearman</p>

      {dados.disponivel ? (
        <>
          <p className="mt-4 font-display text-[2rem] font-bold leading-none text-ink-900">
            {numero(dados.rho, 3)}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-ink-700">{dados.forca}</p>
          <EscalaRho rho={dados.rho} />
          <p className="mt-4 text-sm leading-relaxed text-ink-600">{dados.interpretacao}</p>
        </>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-ink-600">{dados.motivo}</p>
      )}
    </div>
  );
}

function BlocoTendencia({ dados }) {
  if (!dados.disponivel) {
    return (
      <div className="rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 shadow-raised">
        <h3 className="font-display text-base font-bold text-ink-900">Volume de protocolos por semana</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{dados.motivo}</p>
      </div>
    );
  }

  const resumo =
    `${dados.serie.length} semanas; tendência de ${numero(dados.inclinacao)} protocolo(s) por semana`
    + (dados.r2 == null ? '.' : `, R² ${numero(dados.r2)}.`);

  return (
    <div className="rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 shadow-raised">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-ink-900">
            Volume de protocolos por semana
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            Regressão linear simples · {dados.serie.length} semanas completas
          </p>
        </div>

        {/* Legenda: duas séries, então ela sempre aparece */}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-700">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-strong" aria-hidden="true" />
            Protocolos abertos na semana
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-ink-800" aria-hidden="true" />
            Tendência
          </li>
        </ul>
      </div>

      <div className="mt-4 h-64" role="img" aria-label={`Gráfico de colunas: ${resumo}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dados.serie} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={COR_GRADE} vertical={false} />
            <XAxis
              dataKey="semana"
              tickFormatter={diaMes}
              tick={{ fill: COR_TEXTO, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: COR_GRADE }}
              minTickGap={28}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: COR_TEXTO, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip content={<DicaDoGrafico />} cursor={{ fill: 'var(--color-ink-100)', opacity: 0.6 }} />
            <Bar
              dataKey="protocolos"
              fill={COR_BARRA}
              radius={[4, 4, 0, 0]}
              maxBarSize={16}
              isAnimationActive={false}
            />
            <Line
              dataKey="tendencia"
              stroke={COR_TENDENCIA}
              strokeWidth={2}
              strokeLinecap="round"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-600">{dados.interpretacao}</p>

      {/* Visão em tabela: os mesmos números, para quem não enxerga o gráfico */}
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-ink-800">Ver os dados em tabela</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-[var(--radius-field)] border border-ink-200">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-ink-050 text-ink-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Semana (início)</th>
                <th className="px-3 py-2 text-right font-semibold">Protocolos</th>
                <th className="px-3 py-2 text-right font-semibold">Tendência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200 text-ink-700">
              {dados.serie.map((p) => (
                <tr key={p.semana}>
                  <td className="px-3 py-1.5">{dataCompleta(p.semana)}</td>
                  <td className="tabular px-3 py-1.5 text-right">{p.protocolos}</td>
                  <td className="tabular px-3 py-1.5 text-right">{numero(p.tendencia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export default function AnalisesProtocolos() {
  const [estado, setEstado] = useState({ carregando: true, erro: null, dados: null });

  useEffect(() => {
    let ativo = true;
    obterAnalises()
      .then((dados) => ativo && setEstado({ carregando: false, erro: null, dados }))
      .catch((erro) => ativo && setEstado({ carregando: false, erro: erro.message, dados: null }));
    return () => {
      ativo = false;
    };
  }, []);

  const { carregando, erro, dados } = estado;
  const aviso = dados?.dadosFicticios?.aviso;

  return (
    <section className="mt-10" aria-labelledby="titulo-analises">
      <h2 id="titulo-analises" className="text-xs font-bold uppercase tracking-wider text-ink-500">
        Análises dos protocolos
      </h2>
      <p className="measure mt-2 text-sm leading-relaxed text-ink-600">
        Estatística calculada pela API sobre os protocolos, para apoiar a gestão do atendimento.
      </p>

      <div className="mt-4 space-y-4">
        {carregando && <StatusMessage type="loading" message="Calculando as análises…" />}
        {erro && <StatusMessage type="error" message={erro} />}

        {/* Texto + ícone: o aviso nunca depende só da cor */}
        {aviso && (
          <div
            role="note"
            className="flex items-start gap-2.5 rounded-[var(--radius-field)] border border-info/25 bg-info-soft px-3.5 py-3 text-sm leading-snug text-info-ink"
          >
            <Info size={17} className="mt-px shrink-0" aria-hidden="true" />
            <p>
              <span className="font-bold">Dados fictícios de demonstração.</span> {aviso}
            </p>
          </div>
        )}

        {dados && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <BlocoSpearman dados={dados.prioridadeXTempo} />
            <BlocoTendencia dados={dados.tendenciaVolume} />
          </div>
        )}
      </div>
    </section>
  );
}
