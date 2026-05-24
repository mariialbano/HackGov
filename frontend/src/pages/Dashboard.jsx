import React from 'react';
import Navbar from '../components/Navbar';
import ServiceCard from '../components/ServiceCard';
import { Lightbulb, FileText, TrendingUp, Target, MapPin, BarChart3, LogOut } from 'lucide-react';

// Dados dos cartões conforme o seu wireframe
const services = [
  { title: 'Protocolos', desc: 'Acompanhe seus protocolos e solicitações', icon: FileText, path: '/protocolos', hasStatus: true },
  { title: 'Simulação de Inflação', desc: 'Calcule o impacto da inflação', icon: TrendingUp, path: '/inflacao' },
  { title: 'Metas Financeiras', desc: 'Planeje suas metas de economia', icon: Target, path: '/metas' },
  { title: 'Indicadores Locais', desc: 'Dados da sua cidade', icon: MapPin, path: '/indicadores' },
  { title: 'Comparativo Nacional', desc: 'Compare índices regionais', icon: BarChart3, path: '/comparativos' },
  { title: 'Sair', desc: 'Encerrar sessão de forma segura', icon: LogOut, path: '/' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gov-bg">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Cabeçalho da Página Inicial */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-800">Bem-vindo ao HackGov VidaReal</h1>
          <p className="text-gray-600 mt-2">Acesse os serviços digitais e ferramentas de educação financeira.</p>
        </div>

        {/* Grid dos Cartões Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {services.map(service => (
            <ServiceCard 
              key={service.title} 
              title={service.title}
              desc={service.desc}
              icon={service.icon}
              path={service.path}
              hasStatus={service.hasStatus}
            />
          ))}
        </div>

        {/* Bloco Informativo - Sobre a plataforma */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="p-4 bg-orange-100 text-gov-orange rounded-full flex-shrink-0">
            <Lightbulb size={28} />
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-800 mb-1">Sobre o HackGov VidaReal</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Plataforma de transformação digital focada em educação financeira, seguindo os pilares da OCDE de serviços orientados ao usuário e proatividade. Desenvolvida para promover transparência pública e conscientização, alinhada aos ODS da ONU e à Estratégia Nacional de Governo Digital (ENGD).
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}