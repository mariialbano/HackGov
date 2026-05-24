import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { MapPin, Droplets, BookOpen, Wallet } from 'lucide-react';

export default function Indicadores() {
  const [bairro, setBairro] = useState('Centro');

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
          >
            <option>Centro</option>
            <option>Independência</option>
            <option>Gurilândia</option>
            <option>Jardim das Nações</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-t-4 border-t-gov-orange shadow-sm flex items-start gap-4">
            <Wallet className="text-gov-orange" size={28} />
            <div>
              <p className="text-sm text-gray-500">Custo de Vida Médio</p>
              <h3 className="text-xl font-bold text-gray-800">R$ 2.450,00</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-t-4 border-t-blue-500 shadow-sm flex items-start gap-4">
            <Droplets className="text-blue-500" size={28} />
            <div>
              <p className="text-sm text-gray-500">Saneamento Básico</p>
              <h3 className="text-xl font-bold text-gray-800">98% atendido</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-t-4 border-t-gov-green shadow-sm flex items-start gap-4">
            <BookOpen className="text-gov-green" size={28} />
            <div>
              <p className="text-sm text-gray-500">Índice de Educação</p>
              <h3 className="text-xl font-bold text-gray-800">7.2 (IDEB)</h3>
            </div>
          </div>
        </div>

        {/* Placeholder do Mapa */}
        <div className="bg-white rounded-xl border shadow-sm p-4 h-[400px] flex flex-col items-center justify-center bg-gray-50">
          <MapPin size={48} className="text-gray-300 mb-2" />
          <p className="text-gray-500">A integração com React Leaflet (OpenStreetMap) de Taubaté será renderizada aqui.</p>
        </div>
      </main>
    </div>
  );
}