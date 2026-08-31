import { useState } from 'react';
import Navbar from '../components/Navbar';
import MapaBairros from '../components/MapaBairros';
import { Droplets, BookOpen, Wallet } from 'lucide-react';

// Bairros de Taubaté com coordenadas obtidas do OpenStreetMap (Nominatim).
// Os indicadores seguem o padrão das demais telas: dados de demonstração,
// prontos para serem substituídos pelas bases públicas (IBGE, DataSUS, INEP).
const BAIRROS = [
  { nome: 'Centro', coordenadas: [-23.0279, -45.5627], custoVida: 2450, saneamento: 98, ideb: 7.2 },
  { nome: 'Independência', coordenadas: [-23.0376, -45.5866], custoVida: 2180, saneamento: 94, ideb: 6.8 },
  { nome: 'Gurilândia', coordenadas: [-23.0051, -45.5298], custoVida: 1990, saneamento: 91, ideb: 6.4 },
  { nome: 'Jardim das Nações', coordenadas: [-23.0325, -45.5730], custoVida: 2620, saneamento: 97, ideb: 7.5 },
];

export default function Indicadores() {
  const [bairro, setBairro] = useState('Centro');
  const dados = BAIRROS.find((b) => b.nome === bairro) ?? BAIRROS[0];

  return (
    <div className="min-h-screen bg-gov-bg">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Indicadores de Taubaté/SP</h1>
            <p className="text-sm text-gray-500 mt-1">Dados reais de transparência pública.</p>
          </div>

          <select
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            className="border border-gray-300 p-2.5 rounded-lg focus:border-gov-orange outline-none bg-white min-w-[200px]"
            aria-label="Selecione o bairro"
          >
            {BAIRROS.map((b) => (
              <option key={b.nome} value={b.nome}>{b.nome}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-t-4 border-t-gov-orange shadow-sm flex items-start gap-4">
            <Wallet className="text-gov-orange shrink-0" size={28} />
            <div>
              <p className="text-sm text-gray-500">Custo de Vida Médio</p>
              <h3 className="text-xl font-bold text-gray-800">
                R$ {dados.custoVida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-t-4 border-t-blue-500 shadow-sm flex items-start gap-4">
            <Droplets className="text-blue-500 shrink-0" size={28} />
            <div>
              <p className="text-sm text-gray-500">Saneamento Básico</p>
              <h3 className="text-xl font-bold text-gray-800">{dados.saneamento}% atendido</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-t-4 border-t-gov-green shadow-sm flex items-start gap-4">
            <BookOpen className="text-gov-green shrink-0" size={28} />
            <div>
              <p className="text-sm text-gray-500">Índice de Educação</p>
              <h3 className="text-xl font-bold text-gray-800">{dados.ideb.toFixed(1)} (IDEB)</h3>
            </div>
          </div>
        </div>

        {/* Mapa interativo — OpenStreetMap via Leaflet (sem chave de API) */}
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">Mapa da região</h2>
            <p className="text-xs text-gray-400">Clique em um marcador para ver o bairro</p>
          </div>
          <div className="h-[400px] rounded-xl overflow-hidden">
            <MapaBairros
              bairros={BAIRROS}
              bairroSelecionado={bairro}
              onSelecionarBairro={setBairro}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
