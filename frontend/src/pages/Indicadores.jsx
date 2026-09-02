import { useState } from 'react';
import Navbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import MapaBairros from '../components/MapaBairros';
import { controlClass, fieldBorder } from '../utils/formStyles';
import { Droplets, BookOpen, Wallet, Info } from 'lucide-react';

// Bairros de Taubaté com coordenadas obtidas do OpenStreetMap (Nominatim).
// Os indicadores seguem o padrão das demais telas: dados de demonstração,
// prontos para serem substituídos pelas bases públicas (IBGE, DataSUS, INEP).
const BAIRROS = [
  { nome: 'Centro', coordenadas: [-23.0279, -45.5627], custoVida: 2450, saneamento: 98, ideb: 7.2 },
  { nome: 'Independência', coordenadas: [-23.0376, -45.5866], custoVida: 2180, saneamento: 94, ideb: 6.8 },
  { nome: 'Gurilândia', coordenadas: [-23.0051, -45.5298], custoVida: 1990, saneamento: 91, ideb: 6.4 },
  { nome: 'Jardim das Nações', coordenadas: [-23.0325, -45.5730], custoVida: 2620, saneamento: 97, ideb: 7.5 },
];

function Indicador({ icon: Icon, rotulo, valor, unidade, contexto }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 shadow-raised">
      <div className="flex items-center gap-2 text-ink-500">
        <Icon size={16} aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wide">{rotulo}</p>
      </div>
      <p className="tabular mt-3 font-display text-[1.75rem] font-bold leading-none text-ink-900">
        {valor}
        {unidade && <span className="ml-1 text-base font-semibold text-ink-500">{unidade}</span>}
      </p>
      <p className="mt-2 text-xs text-ink-500">{contexto}</p>
    </div>
  );
}

export default function Indicadores() {
  const [bairro, setBairro] = useState('Centro');
  const dados = BAIRROS.find((b) => b.nome === bairro) ?? BAIRROS[0];

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 pb-28 sm:px-6">
        <PageHeader
          title="Indicadores de Taubaté/SP"
          description="Custo de vida, saneamento e educação por região da cidade."
        >
          <select
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            className={`${controlClass} ${fieldBorder(false)} min-w-[13rem] font-medium`}
            aria-label="Selecione o bairro"
          >
            {BAIRROS.map((b) => (
              <option key={b.nome} value={b.nome}>{b.nome}</option>
            ))}
          </select>
        </PageHeader>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Indicador
            icon={Wallet}
            rotulo="Custo de vida"
            valor={`R$ ${dados.custoVida.toLocaleString('pt-BR')}`}
            contexto="Gasto médio mensal por família"
          />
          <Indicador
            icon={Droplets}
            rotulo="Saneamento"
            valor={dados.saneamento}
            unidade="%"
            contexto="Domicílios com acesso à água tratada"
          />
          <Indicador
            icon={BookOpen}
            rotulo="Educação"
            valor={dados.ideb.toFixed(1)}
            contexto="IDEB dos anos finais do ensino fundamental"
          />
        </section>

        {/* Mapa interativo — OpenStreetMap via Leaflet (sem chave de API) */}
        <section className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-surface shadow-raised">
          <div className="flex items-center justify-between gap-4 border-b border-ink-200 px-5 py-4">
            <h2 className="font-display text-base font-bold text-ink-900">Mapa da região</h2>
            <p className="text-xs text-ink-500">Clique em um marcador para trocar de bairro</p>
          </div>
          <div className="h-[420px]">
            <MapaBairros
              bairros={BAIRROS}
              bairroSelecionado={bairro}
              onSelecionarBairro={setBairro}
            />
          </div>
        </section>

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
          <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
          Cartografia por OpenStreetMap. Indicadores em dados de demonstração,
          prontos para integração com as bases públicas do IBGE, DataSUS e INEP.
        </p>
      </main>
    </div>
  );
}
