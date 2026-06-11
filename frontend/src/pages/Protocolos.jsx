import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import FormField from '../components/FormField';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { Plus, X, FileText, Pencil, Trash2, Eye } from 'lucide-react';
import {
  PROTOCOLO_TIPOS,
  STATUS_OPCOES,
  getStatusOpcao,
  gerarIdProtocolo,
  formatarDataHoje,
} from '../utils/protocoloUtils';

const PROTOCOLOS_INICIAIS = [
  {
    id: '2026050712345',
    tipo: 'Análise de viabilidade de Metas Financeiras',
    descricao: 'Solicitação de análise para meta de reserva de emergência de R$ 10.000 em 12 meses.',
    data: '07/05/2026',
    status: 'Em análise',
    progresso: 66,
    prazo: 'Prazo: 15 dias úteis',
    corPrazo: 'bg-gov-orange',
  },
  {
    id: '2026042098765',
    tipo: 'Inscrição em capacitação financeira',
    descricao: 'Inscrição no curso de educação financeira oferecido pela prefeitura de Taubaté.',
    data: '20/04/2026',
    status: 'Concluído',
    progresso: 100,
    prazo: 'Prazo: Concluído',
    corPrazo: 'bg-gov-green',
  },
  {
    id: '2026031554321',
    tipo: 'Análise de viabilidade de Metas Financeiras',
    descricao: 'Consulta sobre viabilidade de meta para viagem internacional no prazo de 18 meses.',
    data: '15/03/2026',
    status: 'Solicitação Criada',
    progresso: 33,
    prazo: 'Prazo: 5 dias úteis',
    corPrazo: 'bg-blue-600',
  },
];

const FORM_INICIAL = {
  tipo: PROTOCOLO_TIPOS[0],
  descricao: '',
  progresso: 33,
};

export default function Protocolos() {
  const [protocolos, setProtocolos] = useState(() => {
    const saved = localStorage.getItem('hackgov_protocolos');
    return saved ? JSON.parse(saved) : PROTOCOLOS_INICIAIS;
  });

  const [modalMode, setModalMode] = useState(null);
  const [detailProtocolo, setDetailProtocolo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { notification, showSuccess, clear } = useToast();

  useEffect(() => {
    localStorage.setItem('hackgov_protocolos', JSON.stringify(protocolos));
  }, [protocolos]);

  const renderCheckpoints = (progresso) => (
    <div className="relative flex items-center justify-between w-full max-w-md mx-auto mt-6 mb-2">
      <div className="absolute left-0 right-0 h-1 bg-gray-200 top-1/2 -translate-y-1/2 z-0" />
      <div
        className="absolute left-0 h-1 bg-gov-green top-1/2 -translate-y-1/2 z-0 transition-all duration-500"
        style={{ width: `${progresso === 33 ? '0%' : progresso === 66 ? '50%' : '100%'}` }}
      />
      <div className="z-10 flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-gov-green text-white flex items-center justify-center text-xs font-bold shadow-xs">✓</div>
        <span className="text-[11px] font-medium text-gray-500 mt-2">Solicitação Criada</span>
      </div>
      <div className="z-10 flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition-colors ${progresso >= 66 ? 'bg-gov-green text-white' : 'bg-gray-200 text-gray-400'}`}>
          {progresso >= 66 ? '✓' : '2'}
        </div>
        <span className="text-[11px] font-medium text-gray-500 mt-2">Em Análise</span>
      </div>
      <div className="z-10 flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition-colors ${progresso === 100 ? 'bg-gov-green text-white' : 'bg-gray-200 text-gray-400'}`}>
          {progresso === 100 ? '✓' : '3'}
        </div>
        <span className="text-[11px] font-medium text-gray-500 mt-2">Concluído</span>
      </div>
    </div>
  );

  const validateForm = () => {
    const errors = {};
    const descricaoTrimmed = formData.descricao.trim();

    if (!descricaoTrimmed) {
      errors.descricao = 'A descrição é obrigatória.';
    } else if (descricaoTrimmed.length < 10) {
      errors.descricao = 'A descrição deve ter no mínimo 10 caracteres.';
    }

    return errors;
  };

  const resetForm = () => {
    setFormData(FORM_INICIAL);
    setFormErrors({});
    setEditingId(null);
    setModalMode(null);
  };

  const openCreateModal = () => {
    setFormData(FORM_INICIAL);
    setFormErrors({});
    setEditingId(null);
    setModalMode('form');
  };

  const openEditModal = (prot) => {
    setFormData({
      tipo: prot.tipo,
      descricao: prot.descricao || '',
      progresso: prot.progresso,
    });
    setFormErrors({});
    setEditingId(prot.id);
    setModalMode('form');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const statusInfo = getStatusOpcao(Number(formData.progresso));

    if (editingId) {
      setProtocolos((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                tipo: formData.tipo,
                descricao: formData.descricao.trim(),
                status: statusInfo.status,
                progresso: statusInfo.value,
                prazo: statusInfo.prazo,
                corPrazo: statusInfo.corPrazo,
              }
            : p
        )
      );
      showSuccess('Protocolo atualizado com sucesso.');
    } else {
      const novoProtocolo = {
        id: gerarIdProtocolo(),
        tipo: formData.tipo,
        descricao: formData.descricao.trim(),
        data: formatarDataHoje(),
        status: statusInfo.status,
        progresso: statusInfo.value,
        prazo: statusInfo.prazo,
        corPrazo: statusInfo.corPrazo,
      };
      setProtocolos((prev) => [novoProtocolo, ...prev]);
      showSuccess(`Protocolo ${novoProtocolo.id} criado com sucesso.`);
    }

    resetForm();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setProtocolos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    showSuccess(`Protocolo ${deleteTarget.id} excluído com sucesso.`);
    if (detailProtocolo?.id === deleteTarget.id) setDetailProtocolo(null);
    setDeleteTarget(null);
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const isEditing = Boolean(editingId);

  return (
    <div className="min-h-screen bg-gov-bg">
      <Navbar />
      <Toast notification={notification} onClose={clear} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Acompanhamento de Protocolos</h1>
            <p className="text-gray-500 text-sm mt-1">Transparência total no fluxo de serviços públicos</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-gov-orange text-white px-5 py-3 rounded-xl hover:bg-orange-600 transition flex items-center justify-center gap-2 shadow-sm font-bold self-start sm:self-auto duration-200"
          >
            <Plus size={18} /> Abrir novo protocolo
          </button>
        </div>

        {protocolos.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
            <FileText size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Nenhum protocolo cadastrado</p>
            <p className="text-sm text-gray-400 mt-1">Clique em &quot;Abrir novo protocolo&quot; para registrar sua primeira solicitação.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {protocolos.map((prot) => (
              <div
                key={prot.id}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col relative overflow-hidden hover:shadow-md transition duration-200 group"
              >
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    type="button"
                    onClick={() => setDetailProtocolo(prot)}
                    className="p-1.5 text-gray-400 hover:text-gov-orange hover:bg-orange-50 rounded-lg transition-colors"
                    title="Ver detalhes"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(prot)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar protocolo"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(prot)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir protocolo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-4 mb-4 pr-20">
                  <div className="flex gap-3 items-start">
                    <div className="p-2.5 bg-orange-50 text-gov-orange rounded-xl mt-0.5">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">Protocolo {prot.id}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{prot.tipo}</p>
                      <p className="text-xs text-gray-400 mt-1">Aberto em {prot.data}</p>
                      {prot.descricao && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 max-w-md">{prot.descricao}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-bold text-white px-3 py-1.5 rounded-lg h-fit self-start sm:self-auto ${prot.corPrazo}`}>
                    {prot.prazo}
                  </span>
                </div>

                {renderCheckpoints(prot.progresso)}
              </div>
            ))}
          </div>
        )}
      </main>

      {modalMode === 'form' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="bg-gov-orange text-white p-5 flex justify-between items-center sticky top-0">
              <h2 className="font-bold text-lg">{isEditing ? 'Editar Protocolo' : 'Abrir Novo Protocolo'}</h2>
              <button type="button" onClick={resetForm} className="hover:opacity-80 transition-opacity">
                <X size={22} />
              </button>
            </div>

            <form className="p-6 space-y-5" onSubmit={handleSubmit}>
              <FormField
                label="Tipo de Protocolo"
                hint="Selecione a categoria que melhor descreve sua solicitação. Isso direciona o atendimento ao setor responsável."
                required
              >
                <select
                  value={formData.tipo}
                  onChange={(e) => updateField('tipo', e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 text-sm outline-none focus:border-gov-orange focus:bg-white transition-all font-medium"
                >
                  {PROTOCOLO_TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </FormField>

              {isEditing && (
                <FormField
                  label="Status do Protocolo"
                  hint="Atualize o andamento conforme o protocolo avança no fluxo de atendimento."
                  required
                >
                  <select
                    value={formData.progresso}
                    onChange={(e) => updateField('progresso', Number(e.target.value))}
                    className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 text-sm outline-none focus:border-gov-orange focus:bg-white transition-all font-medium"
                  >
                    {STATUS_OPCOES.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </FormField>
              )}

              <FormField
                label="Descrição da Solicitação"
                hint="Descreva com clareza o motivo do protocolo. Inclua valores, prazos ou contexto relevante para agilizar a análise."
                required
                error={formErrors.descricao}
                counter={`${formData.descricao.trim().length} / mín. 10 caracteres`}
              >
                <textarea
                  rows="4"
                  value={formData.descricao}
                  onChange={(e) => updateField('descricao', e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 text-sm outline-none focus:border-gov-orange focus:bg-white transition-all resize-none"
                  placeholder="Ex: Gostaria de uma análise de viabilidade para acumular R$ 8.000 em 10 meses para reserva de emergência..."
                />
              </FormField>

              {!isEditing && (
                <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  Após o envio, um número de protocolo será gerado automaticamente e você poderá acompanhar o andamento nesta página.
                </p>
              )}

              <button type="submit" className="w-full bg-gov-green text-white font-bold py-3.5 rounded-xl hover:bg-green-600 transition shadow-md duration-200">
                {isEditing ? 'Salvar Alterações' : 'Enviar Formulário'}
              </button>
            </form>
          </div>
        </div>
      )}

      {detailProtocolo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="bg-gov-orange text-white p-5 flex justify-between items-center">
              <h2 className="font-bold text-lg">Detalhes do Protocolo</h2>
              <button type="button" onClick={() => setDetailProtocolo(null)} className="hover:opacity-80">
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Número</p>
                <p className="font-bold text-gray-800 mt-1">{detailProtocolo.id}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tipo</p>
                <p className="text-gray-700 mt-1">{detailProtocolo.tipo}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</p>
                <p className="text-gray-700 mt-1">{detailProtocolo.status}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data de abertura</p>
                <p className="text-gray-700 mt-1">{detailProtocolo.data}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição</p>
                <p className="text-gray-600 mt-1 text-sm leading-relaxed">
                  {detailProtocolo.descricao || 'Nenhuma descrição registrada.'}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { openEditModal(detailProtocolo); setDetailProtocolo(null); }}
                  className="flex-1 bg-gov-orange text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteTarget(detailProtocolo); setDetailProtocolo(null); }}
                  className="flex-1 bg-white border border-red-200 text-red-600 font-bold py-3 rounded-xl hover:bg-red-50 transition"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Excluir protocolo"
        message={`Tem certeza que deseja excluir o protocolo ${deleteTarget?.id}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
