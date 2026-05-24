import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Target, Plus, X, Trash2, DollarSign, Calendar, CheckCircle2 } from 'lucide-react';

export default function Metas() {
  // Estado para armazenar a lista de metas (carrega do LocalStorage se existir)
  const [metas, setMetas] = useState(() => {
    const saved = localStorage.getItem('hackgov_metas');
    return saved ? JSON.parse(saved) : [
      { id: 1, nome: 'Reserva de Emergência', atual: 3000, objetivo: 10000, prazo: '12 meses', tipo: 'Reserva de Emergência' },
      { id: 2, nome: 'Viagem', atual: 1500, objetivo: 5000, prazo: '6 meses', tipo: 'Viagem' }
    ];
  });

  // Estados para os Modais e Formulários
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState(null);

  // Campos do formulário de criação
  const [novoTipo, setNovoTipo] = useState('Reserva de Emergência');
  const [novoObjetivo, setNovoObjetivo] = useState('');
  const [novoPrazo, setNovoPrazo] = useState('');

  // Campo de entrada de dinheiro na meta existente
  const [valorAdicional, setValorAdicional] = useState('');

  // Salvar no LocalStorage sempre que a lista de metas mudar
  useEffect(() => {
    localStorage.setItem('hackgov_metas', JSON.stringify(metas));
  }, [metas]);

  // Função para Criar Nova Meta
  const handleCriarMeta = (e) => {
    e.preventDefault();
    const novaMeta = {
      id: Date.now(),
      nome: novoTipo,
      tipo: novoTipo,
      atual: 0,
      objetivo: parseFloat(novoObjetivo),
      prazo: novoPrazo.includes('mes') ? novoPrazo : `${novoPrazo} meses`
    };
    setMetas([...metas, novaMeta]);
    setIsCreateModalOpen(false);
    setNovoObjetivo('');
    setNovoPrazo('');
  };

  // Função para Adicionar Dinheiro à Meta
  const handleAdicionarValor = (e) => {
    e.preventDefault();
    const valor = parseFloat(valorAdicional);
    if (isNaN(valor)) return;

    const novasMetas = metas.map(m => {
      if (m.id === selectedMeta.id) {
        return { ...m, atual: m.atual + valor };
      }
      return m;
    });

    setMetas(novasMetas);
    setValorAdicional('');
    setIsEditModalOpen(false);
  };

  // Função para deletar meta
  const handleDeletarMeta = (id) => {
    if(window.confirm("Deseja excluir esta meta?")) {
      setMetas(metas.filter(m => m.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Cabeçalho da área de Metas */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg text-gov-orange">
              <Target size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Suas Metas</h1>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gov-orange text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 transition flex items-center gap-2 shadow-sm font-bold"
          >
            <Plus size={20} /> Nova Meta
          </button>
        </div>

        {/* Grid de Metas Visual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metas.map(meta => {
            const percentual = Math.min(((meta.atual / meta.objetivo) * 100), 100).toFixed(1);
            const isConcluida = meta.atual >= meta.objetivo;

            return (
              <div 
                key={meta.id} 
                onClick={() => { setSelectedMeta(meta); setIsEditModalOpen(true); }}
                className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group relative ${
                  isConcluida ? 'border-green-200 bg-green-50/20' : 'border-gray-100'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                    {meta.nome}
                    {isConcluida && <CheckCircle2 className="text-gov-green" size={20} />}
                  </h3>
                  <span className={`text-xs font-semibold py-1.5 px-3 rounded-lg ${
                    isConcluida ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isConcluida ? 'Finalizada' : `Faltam ${meta.prazo}`}
                  </span>
                </div>
                
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Acumulado</p>
                    <p className={`text-lg font-bold ${isConcluida ? 'text-gov-green' : 'text-gray-700'}`}>
                      R$ {meta.atual.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Objetivo</p>
                    <p className="text-sm font-medium text-gray-500">R$ {meta.objetivo.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                
                {/* Barra de Progresso Percentual */}
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                  <div 
                    className="bg-gov-green h-3 rounded-full transition-all duration-700" 
                    style={{ width: `${percentual}%` }}
                  ></div>
                </div>

                {/* Validação dinâmica da mensagem inferior solicitada */}
                <div className="flex justify-between items-center">
                   <p className={`text-xs font-bold ${isConcluida ? 'text-gov-green' : 'text-gray-400'}`}>
                     {percentual}% concluído
                   </p>
                   {isConcluida ? (
                     <p className="text-xs text-gov-green font-extrabold animate-bounce mt-1">
                       Meta concluída! 🎉
                     </p>
                   ) : (
                     <p className="text-xs text-gov-orange font-bold">
                       Faltam R$ {(meta.objetivo - meta.atual).toLocaleString('pt-BR')}
                     </p>
                   )}
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeletarMeta(meta.id); }}
                  className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* MODAL 1: CRIAR NOVA META */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gov-orange text-white p-6 flex justify-between items-center">
              <h2 className="font-bold text-xl">Planejar Nova Meta</h2>
              <button onClick={() => setIsCreateModalOpen(false)}><X size={24} /></button>
            </div>
            
            <form className="p-8 space-y-6" onSubmit={handleCriarMeta}>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 text-center uppercase tracking-widest">O que você deseja planejar?</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Reserva de Emergência', 'Férias', 'Viagem', 'Investimentos'].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setNovoTipo(tipo)}
                      className={`p-3 text-xs font-bold rounded-xl border-2 transition-all ${
                        novoTipo === tipo 
                        ? 'border-gov-orange bg-orange-50 text-gov-orange shadow-sm' 
                        : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Valor Objetivo (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input 
                      required
                      type="number" 
                      value={novoObjetivo}
                      onChange={e => setNovoObjetivo(e.target.value)}
                      placeholder="Ex: 5000"
                      className="w-full pl-9 pr-4 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-gov-orange transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Prazo (Meses)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input 
                      required
                      type="number" 
                      value={novoPrazo}
                      onChange={e => setNovoPrazo(e.target.value)}
                      placeholder="Ex: 12"
                      className="w-full pl-9 pr-4 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-gov-orange transition-all"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-gov-orange text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition shadow-lg">
                Criar Meta Financeira
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ATUALIZAR META */}
      {isEditModalOpen && selectedMeta && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-800">Atualizar Meta</h2>
              <button onClick={() => setIsEditModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Quanto deseja adicionar para</p>
                <p className="font-bold text-gov-orange text-xl">{selectedMeta.nome}?</p>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-4 font-bold text-gray-400">R$</span>
                <input 
                  autoFocus
                  type="number" 
                  value={valorAdicional}
                  onChange={e => setValorAdicional(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-gov-green focus:bg-white transition-all text-2xl font-bold"
                />
              </div>

              <button 
                onClick={handleAdicionarValor}
                className="w-full bg-gov-green text-white font-bold py-4 rounded-2xl hover:bg-green-600 transition shadow-lg"
              >
                Confirmar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}