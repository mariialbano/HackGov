import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import FormField from '../components/FormField';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import StatusMessage from '../components/StatusMessage';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { Plus, X, FileText, Pencil, Trash2, Eye, Loader2, RefreshCw } from 'lucide-react';
import { PROTOCOLO_TIPOS, STATUS_OPCOES, formatarData } from '../utils/protocoloUtils';
import {
  listarProtocolos,
  criarProtocolo,
  atualizarProtocolo,
  alterarStatus,
  excluirProtocolo,
} from '../api/protocoloService';

const FORM_INICIAL = {
  tipo: PROTOCOLO_TIPOS[0],
  descricao: '',
  progresso: 33,
};

export default function Protocolos() {
  const { user } = useAuth();
  const ehAtendente = user?.perfil === 'atendente';

  // Estados da integração com a API: carregando / sucesso / falha
  const [protocolos, setProtocolos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');

  const [modalMode, setModalMode] = useState(null);
  const [detailProtocolo, setDetailProtocolo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { notification, showSuccess, clear } = useToast();

  // GET /api/v1/protocolos
  // `ehValida` descarta respostas de requisições antigas: se o usuário
  // trocar o filtro rápido, a resposta lenta da anterior não sobrescreve
  // a mais recente.
  const carregarProtocolos = useCallback(
    async (ehValida = () => true) => {
      setCarregando(true);
      setErroCarregamento(null);
      try {
        const resposta = await listarProtocolos({
          status: filtroStatus || undefined,
          limite: 50,
        });
        if (ehValida()) setProtocolos(resposta.dados);
      } catch (error) {
        if (ehValida()) setErroCarregamento(error.message);
      } finally {
        if (ehValida()) setCarregando(false);
      }
    },
    [filtroStatus]
  );

  useEffect(() => {
    let ativo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados na montagem/troca de filtro
    carregarProtocolos(() => ativo);
    return () => {
      ativo = false;
    };
  }, [carregarProtocolos]);

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
    setErroFormulario(null);
    setEditingId(null);
    setModalMode(null);
  };

  const openCreateModal = () => {
    setFormData(FORM_INICIAL);
    setFormErrors({});
    setErroFormulario(null);
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
    setErroFormulario(null);
    setEditingId(prot.id);
    setModalMode('form');
  };

  // POST /api/v1/protocolos  |  PUT /api/v1/protocolos/:id
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;

    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEnviando(true);
    setErroFormulario(null);

    try {
      if (editingId) {
        await atualizarProtocolo(editingId, {
          tipo: formData.tipo,
          descricao: formData.descricao.trim(),
          progresso: Number(formData.progresso),
        });
        showSuccess('Protocolo atualizado com sucesso.');
      } else {
        const criado = await criarProtocolo({
          tipo: formData.tipo,
          descricao: formData.descricao.trim(),
        });
        showSuccess(`Protocolo ${criado.id} criado com sucesso.`);
      }
      resetForm();
      await carregarProtocolos();
    } catch (error) {
      // Erros de validação do servidor vêm em error.details (campo + mensagem)
      if (error.details?.length) {
        setFormErrors(
          error.details.reduce((acc, d) => ({ ...acc, [d.campo]: d.mensagem }), {})
        );
      }
      setErroFormulario(error.message);
    } finally {
      setEnviando(false);
    }
  };

  // PATCH /api/v1/protocolos/:id/status — só o atendente pode tramitar
  const handleTramitar = async (prot, progresso) => {
    try {
      const atualizado = await alterarStatus(prot.id, progresso);
      showSuccess(`Protocolo ${prot.id} movido para "${atualizado.status}".`);
      setDetailProtocolo(null);
      await carregarProtocolos();
    } catch (error) {
      setErroCarregamento(error.message);
    }
  };

  // DELETE /api/v1/protocolos/:id
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const alvo = deleteTarget;
    setDeleteTarget(null);

    try {
      await excluirProtocolo(alvo.id);
      showSuccess(`Protocolo ${alvo.id} excluído com sucesso.`);
      if (detailProtocolo?.id === alvo.id) setDetailProtocolo(null);
      await carregarProtocolos();
    } catch (error) {
      setErroCarregamento(error.message);
    }
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
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Acompanhamento de Protocolos</h1>
            <p className="text-gray-500 text-sm mt-1">
              {ehAtendente
                ? 'Painel do atendente: todos os protocolos abertos na plataforma'
                : 'Transparência total no fluxo de serviços públicos'}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-gov-orange text-white px-5 py-3 rounded-xl hover:bg-orange-600 transition flex items-center justify-center gap-2 shadow-sm font-bold self-start sm:self-auto duration-200"
          >
            <Plus size={18} /> Abrir novo protocolo
          </button>
        </div>

        {/* Filtro server-side: GET /protocolos?status=... */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Filtrar</span>
          {['', ...STATUS_OPCOES.map((o) => o.status)].map((valor) => (
            <button
              key={valor || 'todos'}
              type="button"
              onClick={() => setFiltroStatus(valor)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                filtroStatus === valor
                  ? 'bg-gov-orange text-white border-gov-orange'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gov-orange hover:text-gov-orange'
              }`}
            >
              {valor || 'Todos'}
            </button>
          ))}
          <button
            type="button"
            onClick={carregarProtocolos}
            className="ml-auto text-xs font-medium text-gray-500 hover:text-gov-orange flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
            title="Recarregar da API"
          >
            <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>

        {/* Estado: carregando */}
        {carregando && (
          <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
            <Loader2 size={32} className="text-gov-orange mx-auto mb-3 animate-spin" />
            <p className="text-gray-500 text-sm">Carregando protocolos...</p>
          </div>
        )}

        {/* Estado: falha */}
        {!carregando && erroCarregamento && (
          <div className="space-y-3">
            <StatusMessage type="error" message={erroCarregamento} />
            <button
              type="button"
              onClick={carregarProtocolos}
              className="text-sm font-bold text-gov-orange hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Estado: sucesso, porém sem registros */}
        {!carregando && !erroCarregamento && protocolos.length === 0 && (
          <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
            <FileText size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Nenhum protocolo encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              {filtroStatus
                ? 'Nenhum protocolo neste status. Tente outro filtro.'
                : 'Clique em "Abrir novo protocolo" para registrar sua primeira solicitação.'}
            </p>
          </div>
        )}

        {/* Estado: sucesso com dados */}
        {!carregando && !erroCarregamento && protocolos.length > 0 && (
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
                      <p className="text-xs text-gray-400 mt-1">Aberto em {formatarData(prot.abertoEm)}</p>
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

                {/* Tramitação rápida: exclusiva do atendente (RBAC) */}
                {ehAtendente && prot.progresso < 100 && (
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-50">
                    <button
                      type="button"
                      onClick={() => handleTramitar(prot, prot.progresso === 33 ? 66 : 100)}
                      className="text-xs font-bold text-white bg-gov-green px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      {prot.progresso === 33 ? 'Iniciar análise' : 'Concluir protocolo'}
                    </button>
                  </div>
                )}
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
                error={formErrors.tipo}
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

              {isEditing && ehAtendente && (
                <FormField
                  label="Status do Protocolo"
                  hint="Atualize o andamento conforme o protocolo avança no fluxo de atendimento."
                  required
                  error={formErrors.progresso}
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

              {erroFormulario && <StatusMessage type="error" message={erroFormulario} />}

              {!isEditing && !erroFormulario && (
                <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  Após o envio, um número de protocolo será gerado automaticamente e você poderá acompanhar o andamento nesta página.
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-gov-green text-white font-bold py-3.5 rounded-xl hover:bg-green-600 transition shadow-md duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {enviando && <Loader2 size={18} className="animate-spin" />}
                {enviando ? 'Enviando...' : isEditing ? 'Salvar Alterações' : 'Enviar Formulário'}
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
                <p className="text-gray-700 mt-1">{formatarData(detailProtocolo.abertoEm)}</p>
              </div>
              {detailProtocolo.concluidoEm && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Concluído em</p>
                  <p className="text-gray-700 mt-1">{formatarData(detailProtocolo.concluidoEm)}</p>
                </div>
              )}
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
