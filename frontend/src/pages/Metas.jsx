import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import FormField from '../components/FormField';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { Target, Plus, X, Trash2, DollarSign, Calendar, CheckCircle2, Pencil } from 'lucide-react';

const TIPOS_PADRAO = ['Reserva de Emergência', 'Férias', 'Viagem', 'Investimentos'];
const TIPO_OUTROS = 'Outros';

function resolveTipoNome(tipo, custom) {
  return tipo === TIPO_OUTROS ? custom.trim() : tipo;
}

function parseTipoFromMeta(meta) {
  if (TIPOS_PADRAO.includes(meta.tipo)) {
    return { tipo: meta.tipo, custom: '' };
  }
  return { tipo: TIPO_OUTROS, custom: meta.tipo };
}

export default function Metas() {
  const [metas, setMetas] = useState(() => {
    const saved = localStorage.getItem('hackgov_metas');
    return saved ? JSON.parse(saved) : [
      { id: 1, nome: 'Reserva de Emergência', atual: 3000, objetivo: 10000, prazo: '12 meses', tipo: 'Reserva de Emergência' },
      { id: 2, nome: 'Viagem', atual: 1500, objetivo: 5000, prazo: '6 meses', tipo: 'Viagem' },
    ];
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditMetaModalOpen, setIsEditMetaModalOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [novoTipo, setNovoTipo] = useState('Reserva de Emergência');
  const [novoTipoCustom, setNovoTipoCustom] = useState('');
  const [novoObjetivo, setNovoObjetivo] = useState('');
  const [novoPrazo, setNovoPrazo] = useState('');
  const [valorAdicional, setValorAdicional] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editTipoCustom, setEditTipoCustom] = useState('');
  const [editObjetivo, setEditObjetivo] = useState('');
  const [editPrazo, setEditPrazo] = useState('');

  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [editMetaErrors, setEditMetaErrors] = useState({});

  const { notification, showSuccess, clear } = useToast();

  useEffect(() => {
    localStorage.setItem('hackgov_metas', JSON.stringify(metas));
  }, [metas]);

  const validateCreateForm = () => {
    const errors = {};
    const objetivoStr = novoObjetivo.toString().trim();
    const prazoStr = novoPrazo.toString().trim();

    if (!objetivoStr) {
      errors.objetivo = 'O valor objetivo é obrigatório.';
    } else if (isNaN(parseFloat(objetivoStr)) || parseFloat(objetivoStr) <= 0) {
      errors.objetivo = 'O valor da meta deve ser maior que zero.';
    }

    if (!prazoStr) {
      errors.prazo = 'O prazo é obrigatório.';
    } else if (isNaN(parseFloat(prazoStr)) || parseFloat(prazoStr) <= 0) {
      errors.prazo = 'O prazo deve ser maior que zero.';
    }

    if (novoTipo === TIPO_OUTROS) {
      if (!novoTipoCustom.trim()) {
        errors.tipoCustom = 'Informe o nome da categoria.';
      } else if (novoTipoCustom.trim().length < 2) {
        errors.tipoCustom = 'O nome deve ter no mínimo 2 caracteres.';
      }
    }

    return errors;
  };

  const validateEditForm = () => {
    const errors = {};
    const valorStr = valorAdicional.toString().trim();

    if (!valorStr) {
      errors.valorAdicional = 'O valor adicional é obrigatório.';
    } else if (isNaN(parseFloat(valorStr)) || parseFloat(valorStr) <= 0) {
      errors.valorAdicional = 'O valor adicional deve ser maior que zero.';
    }

    return errors;
  };

  const validateEditMetaForm = () => {
    const errors = {};
    const objetivoStr = editObjetivo.toString().trim();
    const prazoStr = editPrazo.toString().trim();

    if (!objetivoStr) {
      errors.objetivo = 'O valor objetivo é obrigatório.';
    } else if (isNaN(parseFloat(objetivoStr)) || parseFloat(objetivoStr) <= 0) {
      errors.objetivo = 'O valor da meta deve ser maior que zero.';
    }

    if (!prazoStr) {
      errors.prazo = 'O prazo é obrigatório.';
    } else if (isNaN(parseFloat(prazoStr)) || parseFloat(prazoStr) <= 0) {
      errors.prazo = 'O prazo deve ser maior que zero.';
    }

    if (editTipo === TIPO_OUTROS) {
      if (!editTipoCustom.trim()) {
        errors.tipoCustom = 'Informe o nome da categoria.';
      } else if (editTipoCustom.trim().length < 2) {
        errors.tipoCustom = 'O nome deve ter no mínimo 2 caracteres.';
      }
    }

    return errors;
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateErrors({});
    setNovoObjetivo('');
    setNovoPrazo('');
    setNovoTipo('Reserva de Emergência');
    setNovoTipoCustom('');
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditErrors({});
    setValorAdicional('');
    setSelectedMeta(null);
  };

  const handleCloseEditMetaModal = () => {
    setIsEditMetaModalOpen(false);
    setEditMetaErrors({});
    setEditTipoCustom('');
    setSelectedMeta(null);
  };

  const handleCriarMeta = (e) => {
    e.preventDefault();
    const errors = validateCreateForm();
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const nomeTipo = resolveTipoNome(novoTipo, novoTipoCustom);
    const novaMeta = {
      id: Date.now(),
      nome: nomeTipo,
      tipo: nomeTipo,
      atual: 0,
      objetivo: parseFloat(novoObjetivo),
      prazo: novoPrazo.includes('mes') ? novoPrazo : `${novoPrazo} meses`,
    };
    setMetas([...metas, novaMeta]);
    showSuccess(`Meta "${novaMeta.nome}" criada com sucesso.`);
    handleCloseCreateModal();
  };

  const handleAdicionarValor = (e) => {
    e.preventDefault();
    const errors = validateEditForm();
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const valor = parseFloat(valorAdicional);
    const novasMetas = metas.map((m) =>
      m.id === selectedMeta.id ? { ...m, atual: m.atual + valor } : m
    );

    setMetas(novasMetas);
    showSuccess(`R$ ${valor.toLocaleString('pt-BR')} adicionado à meta "${selectedMeta.nome}".`);
    handleCloseEditModal();
  };

  const handleEditarMeta = (e) => {
    e.preventDefault();
    const errors = validateEditMetaForm();
    setEditMetaErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const nomeTipo = resolveTipoNome(editTipo, editTipoCustom);
    const novasMetas = metas.map((m) =>
      m.id === selectedMeta.id
        ? {
            ...m,
            nome: nomeTipo,
            tipo: nomeTipo,
            objetivo: parseFloat(editObjetivo),
            prazo: editPrazo.includes('mes') ? editPrazo : `${editPrazo} meses`,
          }
        : m
    );

    setMetas(novasMetas);
    showSuccess(`Meta "${nomeTipo}" atualizada com sucesso.`);
    handleCloseEditMetaModal();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setMetas((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    showSuccess(`Meta "${deleteTarget.nome}" excluída com sucesso.`);
    setDeleteTarget(null);
  };

  const openEditMeta = (meta, e) => {
    e.stopPropagation();
    const { tipo, custom } = parseTipoFromMeta(meta);
    setSelectedMeta(meta);
    setEditTipo(tipo);
    setEditTipoCustom(custom);
    setEditObjetivo(meta.objetivo.toString());
    setEditPrazo(meta.prazo.replace(/\s*meses?/i, '').trim());
    setEditMetaErrors({});
    setIsEditMetaModalOpen(true);
  };

  const openAddValor = (meta) => {
    setSelectedMeta(meta);
    setEditErrors({});
    setValorAdicional('');
    setIsEditModalOpen(true);
  };

  const inputMetaClass = 'w-full pl-9 pr-4 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-gov-orange transition-all';

  const renderSeletorCategoria = ({ tipo, setTipo, custom, setCustom, errors, setErrors, hint }) => (
    <>
      <FormField label="Categoria da Meta" hint={hint} required>
        <div className="grid grid-cols-2 gap-3">
          {TIPOS_PADRAO.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setTipo(item);
                setCustom('');
                if (errors.tipoCustom) setErrors((prev) => ({ ...prev, tipoCustom: undefined }));
              }}
              className={`p-3 text-xs font-bold rounded-xl border-2 transition-all ${
                tipo === item
                  ? 'border-gov-orange bg-orange-50 text-gov-orange shadow-sm'
                  : 'border-gray-100 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTipo(TIPO_OUTROS)}
            className={`col-span-2 p-3 text-xs font-bold rounded-xl border-2 transition-all ${
              tipo === TIPO_OUTROS
                ? 'border-gov-orange bg-orange-50 text-gov-orange shadow-sm'
                : 'border-gray-100 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Outros
          </button>
        </div>
      </FormField>

      {tipo === TIPO_OUTROS && (
        <FormField
          label="Nome da Categoria"
          hint="Descreva o objetivo da sua meta quando não se encaixa nas opções acima."
          required
          error={errors.tipoCustom}
        >
          <input
            type="text"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              if (errors.tipoCustom) setErrors((prev) => ({ ...prev, tipoCustom: undefined }));
            }}
            placeholder="Ex: Reforma da casa, Casamento..."
            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-gov-orange transition-all"
          />
        </FormField>
      )}
    </>
  );

  const renderCamposValorPrazo = ({ objetivo, setObjetivo, prazo, setPrazo, errors, setErrors }) => (
    <div className="space-y-4">
      <FormField
        label="Valor Objetivo (R$)"
        hint="Quanto você pretende acumular para atingir esta meta."
        required
        error={errors.objetivo}
      >
        <div className="relative">
          <DollarSign className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            type="number"
            min="0"
            step="0.01"
            value={objetivo}
            onChange={(e) => {
              setObjetivo(e.target.value);
              if (errors.objetivo) setErrors((prev) => ({ ...prev, objetivo: undefined }));
            }}
            placeholder="Ex: 5000"
            className={inputMetaClass}
          />
        </div>
      </FormField>

      <FormField
        label="Prazo (Meses)"
        hint="Em quantos meses você deseja atingir o valor."
        required
        error={errors.prazo}
      >
        <div className="relative">
          <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            type="number"
            min="1"
            value={prazo}
            onChange={(e) => {
              setPrazo(e.target.value);
              if (errors.prazo) setErrors((prev) => ({ ...prev, prazo: undefined }));
            }}
            placeholder="Ex: 12"
            className={inputMetaClass}
          />
        </div>
      </FormField>
    </div>
  );

  return (
    <div className="min-h-screen bg-gov-bg">
      <Navbar />
      <Toast notification={notification} onClose={clear} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg text-gov-orange">
              <Target size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Suas Metas</h1>
              <p className="text-sm text-gray-500 mt-0.5">Planeje, acompanhe e gerencie seus objetivos financeiros</p>
            </div>
          </div>
          <button
            onClick={() => { setCreateErrors({}); setIsCreateModalOpen(true); }}
            className="bg-gov-orange text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 transition flex items-center gap-2 shadow-sm font-bold"
          >
            <Plus size={20} /> Nova Meta
          </button>
        </div>

        {metas.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
            <Target size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Nenhuma meta cadastrada</p>
            <p className="text-sm text-gray-400 mt-1">Crie sua primeira meta financeira para começar a planejar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metas.map((meta) => {
              const percentual = Math.min(((meta.atual / meta.objetivo) * 100), 100).toFixed(1);
              const isConcluida = meta.atual >= meta.objetivo;

              return (
                <div
                  key={meta.id}
                  onClick={() => openAddValor(meta)}
                  className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group relative ${
                    isConcluida ? 'border-green-200 bg-green-50/20' : 'border-gray-100'
                  }`}
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={(e) => openEditMeta(meta, e)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar meta"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(meta); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir meta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex justify-between items-start mb-6 pr-16">
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

                  <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                    <div
                      className="bg-gov-green h-3 rounded-full transition-all duration-700"
                      style={{ width: `${percentual}%` }}
                    />
                  </div>

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
                </div>
              );
            })}
          </div>
        )}
      </main>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gov-orange text-white p-6 flex justify-between items-center sticky top-0">
              <h2 className="font-bold text-xl">Planejar Nova Meta</h2>
              <button type="button" onClick={handleCloseCreateModal}><X size={24} /></button>
            </div>

            <form className="p-8 space-y-6" onSubmit={handleCriarMeta}>
              {renderSeletorCategoria({
                tipo: novoTipo,
                setTipo: setNovoTipo,
                custom: novoTipoCustom,
                setCustom: setNovoTipoCustom,
                errors: createErrors,
                setErrors: setCreateErrors,
                hint: 'Escolha o tipo de objetivo financeiro. Isso ajuda a organizar e priorizar seus planos.',
              })}

              {renderCamposValorPrazo({
                objetivo: novoObjetivo,
                setObjetivo: setNovoObjetivo,
                prazo: novoPrazo,
                setPrazo: setNovoPrazo,
                errors: createErrors,
                setErrors: setCreateErrors,
              })}

              <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">
                Após criar, clique no card da meta para registrar depósitos e acompanhar o progresso.
              </p>

              <button type="submit" className="w-full bg-gov-orange text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition shadow-lg">
                Criar Meta Financeira
              </button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedMeta && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-800">Registrar Depósito</h2>
              <button type="button" onClick={handleCloseEditModal}><X size={24} className="text-gray-400" /></button>
            </div>

            <form className="p-8 space-y-6" onSubmit={handleAdicionarValor}>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Adicionar valor à meta</p>
                <p className="font-bold text-gov-orange text-xl">{selectedMeta.nome}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Acumulado: R$ {selectedMeta.atual.toLocaleString('pt-BR')} de R$ {selectedMeta.objetivo.toLocaleString('pt-BR')}
                </p>
              </div>

              <FormField
                label="Valor do Depósito (R$)"
                hint="Informe quanto você está adicionando neste momento. O progresso será atualizado automaticamente."
                required
                error={editErrors.valorAdicional}
              >
                <div className="relative">
                  <span className="absolute left-4 top-4 font-bold text-gray-400">R$</span>
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    step="0.01"
                    value={valorAdicional}
                    onChange={(e) => {
                      setValorAdicional(e.target.value);
                      if (editErrors.valorAdicional) setEditErrors((prev) => ({ ...prev, valorAdicional: undefined }));
                    }}
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-gov-green focus:bg-white transition-all text-2xl font-bold"
                  />
                </div>
              </FormField>

              <button
                type="submit"
                className="w-full bg-gov-green text-white font-bold py-4 rounded-2xl hover:bg-green-600 transition shadow-lg"
              >
                Confirmar Entrada
              </button>
            </form>
          </div>
        </div>
      )}

      {isEditMetaModalOpen && selectedMeta && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gov-orange text-white p-6 flex justify-between items-center sticky top-0">
              <h2 className="font-bold text-xl">Editar Meta</h2>
              <button type="button" onClick={handleCloseEditMetaModal}><X size={24} /></button>
            </div>

            <form className="p-8 space-y-6" onSubmit={handleEditarMeta}>
              {renderSeletorCategoria({
                tipo: editTipo,
                setTipo: setEditTipo,
                custom: editTipoCustom,
                setCustom: setEditTipoCustom,
                errors: editMetaErrors,
                setErrors: setEditMetaErrors,
                hint: 'Altere a categoria se o objetivo da meta mudou.',
              })}

              {renderCamposValorPrazo({
                objetivo: editObjetivo,
                setObjetivo: setEditObjetivo,
                prazo: editPrazo,
                setPrazo: setEditPrazo,
                errors: editMetaErrors,
                setErrors: setEditMetaErrors,
              })}

              <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">
                O valor já acumulado (R$ {selectedMeta.atual.toLocaleString('pt-BR')}) será mantido.
              </p>

              <button type="submit" className="w-full bg-gov-orange text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition shadow-lg">
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Excluir meta"
        message={`Tem certeza que deseja excluir a meta "${deleteTarget?.nome}"? Todo o progresso acumulado será perdido.`}
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
