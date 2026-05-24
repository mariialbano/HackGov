import React from 'react';
import Navbar from '../components/Navbar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Saneamento (%)', Taubate: 98, EstadoSP: 95, Nacional: 84 },
  { name: 'IDEB (Anos Finais)', Taubate: 7.2, EstadoSP: 6.5, Nacional: 5.8 },
  { name: 'Desenv. Humano (IDHM)', Taubate: 80, EstadoSP: 82, Nacional: 76 }, // Valores multiplicados por 100 para o gráfico de barras
];

export default function Comparativos() {
  return (
    <div className="min-h-screen bg-gov-bg">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Comparativo Regional e Nacional</h1>
          <p className="text-gray-600 mt-1">Como Taubaté se posiciona em relação ao Estado e ao Brasil.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm h-[500px]">
          <h2 className="font-bold text-gray-700 mb-6">Métricas de Desenvolvimento</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip cursor={{fill: '#f3f4f6'}} />
              <Legend />
              {/* Cores padronizadas */}
              <Bar dataKey="Taubate" name="Taubaté/SP" fill="#ff8101" radius={[4, 4, 0, 0]} />
              <Bar dataKey="EstadoSP" name="Estado de São Paulo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Nacional" name="Média Nacional" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}