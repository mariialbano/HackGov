import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Plus, CheckCircle2, Clock, AlertCircle, X, FileText } from 'lucide-react';

export default function Protocolos() {
  // Estado para armazenar os chamados (Carrega do LocalStorage ou define os mockados iniciais do Figma)
  const [protocolos, setProtocolos] = useState(() => {
    const saved = localStorage.getItem('hackgov_protocolos');
    return saved ? JSON.parse(saved) : [
      { 
        id: '2026050712345', 
        tipo: 'Análise de viabilidade de Metas Financeiras', 
        data: '07/05/2026', 
        status: 'Em análise', 
        progresso: 66,
        prazo: 'Prazo: 15 dias úteis',
        corPrazo: 'bg-gov-orange'
      },
      { 
        id: '2026042098765', 
        tipo: 'Inscrição em capacitação financeira', 
        data: '20/04/2026', 
        status: 'Concluído', 
        progresso: 100,
        prazo: 'Prazo: Concluído',
        corPrazo: 'bg-gov-green'
      },
      { 
        id: '2026031554321', 
        tipo: 'Análise de viabilidade de Metas Financeiras', 
        data: '15/03/2026', 
        status: 'Solicitação Criada', 
        progresso: 33,
        prazo: 'Prazo: 5 dias úteis',
        corPrazo: 'bg-blue-600'
      }
    ];
  });

  // Estados para gerenciar o Modal e os Inputs do formulário
  const [modalOpen, setModalOpen] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState('Análise de viabilidade de Metas Financeiras');
  const [descricao, setDescricao] = useState('');

  // Salva na memória do navegador sempre que a lista de chamados for atualizada
  useEffect(() => {
    localStorage.setItem('hackgov_protocolos', JSON.stringify(protocolos));
  }, [protocolos]);

  // Função para processar e renderizar os checkpoints visuais do seu design
  const renderCheckpoints = (progresso) => {
    return (
      <div className="relative flex items-center justify-between w-full max-w-md mx-auto mt-6 mb-2">
        {/* Linha de fundo cinza */}
        <div className="absolute left-0 right-0 h-1 bg-gray-200 top-1/2 -translate-y-1/2 z-0"></div>
        {/* Linha preenchida verde baseada no progresso */}
        <div 
          className="absolute left-0 h-1 bg-gov-green top-1/2 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${progresso === 33 ? '0%' : progresso === 66 ? '50%' : '100%'}` }}
        ></div>

        {/* Checkpoint 1 */}
        <div className="z-10 flex flex-col items-center">
          <div className="w-7 h-7 rounded-full bg-gov-green text-white flex items-center justify-center text-xs font-bold shadow-xs">✓</div>
          <span className="text-[11px] font-medium text-gray-500 mt-2">Solicitação Criada</span>
        </div>

        {/* Checkpoint 2 */}
        <div className="z-10 flex flex-col items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition-colors ${progresso >= 66 ? 'bg-gov-green text-white' : 'bg-gray-200 text-gray-400'}`}>
            {progresso >= 66 ? '✓' : '2'}
          </div>
          <span className="text-[11px] font-medium text-gray-500 mt-2">Em Análise</span>
        </div>

        {/* Checkpoint 3 */}
        <div className="z-10 flex flex-col items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition-colors ${progresso === 100 ? 'bg-gov-green text-white' : 'bg-gray-200 text-gray-400'}`}>
            {progresso === 100 ? '✓' : '3'}
          </div>
          <span className="text-[11px] font-medium text-gray-500 mt-2">Concluído</span>
        </div>
      </div>
    );
  };

  // Lógica executada quando o usuário envia o formulário de novo protocolo
  const handleCriarProtocolo = (e) => {
    e.preventDefault();

    // Gera um número identificador baseado na data/hora atual para evitar repetições
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const random = Math.floor(10000 + Math.random() * 90000);
    const novoId = `${ano}${mes}${dia}${random}`;

    const dataFormatada = `${dia}/${mes}/${ano}`;

    // Monta o objeto com o status inicial
    const novoProtocolo = {
      id: novoId,
      tipo: tipoSelecionado,
      data: dataFormatada,
      status: 'Solicitação Criada',
      progresso: 33,
      prazo: 'Prazo: 20 dias úteis',
      corPrazo: 'bg-blue-600'
    };

    // Atualiza o estado jogando o novo chamado no TOPO da lista
    setProtocolos([novoProtocolo, ...protocolos]);
    
    // Fecha o modal e limpa os campos
    setModalOpen(false);
    setDescricao('');
    setTipoSelecionado('Análise de viabilidade de Metas Financeiras');
  };

  return (
    <div className="min-h-screen bg-gov-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        
        {/* Cabeçalho da página de Protocolos */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Acompanhamento de Protocolos</h1>
            <p className="text-gray-500 text-sm mt-1">Transparência total no fluxo de serviços públicos</p>
          </div>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-gov-orange text-white px-5 py-3 rounded-xl hover:bg-orange-600 transition flex items-center justify-center gap-2 shadow-sm font-bold self-start sm:self-auto duration-200"
          >
            <Plus size={18} /> Abrir novo protocolo
          </button>
        </div>

        {/* Listagem de Protocolos Reativa */}
        <div className="space-y-6">
          {protocolos.map(prot => (
            <div key={prot.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col relative overflow-hidden hover:shadow-md transition duration-200">
              
              {/* Topo do Card de Protocolo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-4 mb-4">
                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-orange-50 text-gov-orange rounded-xl mt-0.5">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">Protocolo {prot.id}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{prot.tipo}</p>
                    <p className="text-xs text-gray-400 mt-1">Aberto em {prot.data}</p>
                  </div>
                </div>
                
                {/* Tag de Prazo colorida igual ao Figma */}
                <span className={`text-xs font-bold text-white px-3 py-1.5 rounded-lg h-fit self-start sm:self-auto ${prot.corPrazo}`}>
                  {prot.prazo}
                </span>
              </div>

              {/* Renderizador de Checkpoints Dinâmico */}
              {renderCheckpoints(prot.progresso)}

            </div>
          ))}
        </div>
      </main>

      {/* MODAL DE CRIAÇÃO DO NOVO PROTOCOLO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="bg-gov-orange text-white p-5 flex justify-between items-center">
              <h2 className="font-bold text-lg">Abrir Novo Protocolo</h2>
              <button onClick={() => setModalOpen(false)} className="hover:opacity-80 transition-opacity"><X size={22} /></button>
            </div>
            
            <form className="p-6 space-y-5" onSubmit={handleCriarProtocolo}>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Protocolo</label>
                <select 
                  value={tipoSelecionado}
                  onChange={(e) => setTipoSelecionado(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 text-sm outline-none focus:border-gov-orange focus:bg-white transition-all font-medium"
                >
                  <option>Análise de viabilidade de Metas Financeiras</option>
                  <option>Dúvida sobre inflação</option>
                  <option>Solicitação de orientação financeira</option>
                  <option>Problema técnico</option>
                  <option>Sugestão de melhoria</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Descrição do Problema</label>
                <textarea 
                  required
                  rows="4" 
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 text-sm outline-none focus:border-gov-orange focus:bg-white transition-all resize-none" 
                  placeholder="Descreva detalhadamente a sua solicitação..."
                ></textarea>
              </div>
              
              <button type="submit" className="w-full bg-gov-green text-white font-bold py-3.5 rounded-xl hover:bg-green-600 transition shadow-md duration-200">
                Enviar Formulário
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}