import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

export default function Inflacao() {
  const [valor, setValor] = useState(1000);
  const [anos, setAnos] = useState(5);
  const [inflacao, setInflacao] = useState(4.5); // % ao ano

  // Cálculo mockado da inflação (Valor Futuro)
  const valorFuturo = (valor * Math.pow(1 + (inflacao / 100), anos)).toFixed(2);
  
  // Gerando dados para o gráfico
  const data = Array.from({ length: parseInt(anos) + 1 }, (_, i) => ({
    ano: `Ano ${i}`,
    valor: (valor * Math.pow(1 + (inflacao / 100), i)).toFixed(2)
  }));

  return (
    <div className="min-h-screen bg-gov-bg">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Simulador de Inflação</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Calculadora */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <h2 className="font-bold text-lg mb-4 text-gov-orange">Calculadora</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Valor Atual (R$)</label>
                <input type="number" value={valor} onChange={e => setValor(e.target.value)} className="w-full border p-2 rounded-lg focus:border-gov-orange outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Período (Anos)</label>
                <input type="number" value={anos} onChange={e => setAnos(e.target.value)} className="w-full border p-2 rounded-lg focus:border-gov-orange outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Taxa de Inflação (% ao ano)</label>
                <input type="number" value={inflacao} onChange={e => setInflacao(e.target.value)} className="w-full border p-2 rounded-lg focus:border-gov-orange outline-none" />
              </div>
              <button className="w-full mt-4 bg-gray-100 text-gray-700 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition">
                <Download size={18} /> Exportar PDF
              </button>
            </div>
          </div>

          {/* Gráfico e Resultados */}
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-sm text-gray-500">Poder de compra necessário</p>
                <h3 className="text-2xl font-bold text-gov-orange">R$ {valorFuturo}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-sm text-gray-500">Crescimento Nominal</p>
                <h3 className="text-2xl font-bold text-red-500">+ {((valorFuturo / valor - 1) * 100).toFixed(1)}%</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm h-80">
              <h3 className="font-bold mb-4 text-gray-700">Projeção do Custo de Vida</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="ano" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip formatter={(value) => `R$ ${value}`} />
                  <Line type="monotone" dataKey="valor" stroke="#ff8101" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}