import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import { controlClass, fieldBorder } from '../utils/formStyles';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import StatusMessage from '../components/StatusMessage';
import StatusBadge from '../components/StatusBadge';
import PrioridadeBadge from '../components/PrioridadeBadge';
import SugestaoTriagem from '../components/SugestaoTriagem';
import Button from '../components/Button';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { Plus, X, FileText, Pencil, Trash2, Eye, Loader2, RefreshCw, Check, CalendarClock, Download, ArrowDownWideNarrow } from 'lucide-react';
import { PROTOCOLO_TIPOS, STATUS_OPCOES, getStatusOpcao, formatarData } from '../utils/protocoloUtils';
import { obterPrazo } from '../api/dadosPublicosService';
import { novoRelatorio } from '../utils/relatorioPdf';
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

const ETAPAS = [
  { valor: 33, rotulo: 'Solicitação Criada' },
  { valor: 66, rotulo: 'Em Análise' },
  { valor: 100, rotulo: 'Concluído' },
];

// Trilha de progresso do protocolo: mostra em que etapa o pedido está e
// quanto falta, sem depender apenas da cor para comunicar.
function Trilha({ progresso }) {
  const larguraPreenchida = progresso === 33 ? '0%' : progresso === 66 ? '50%' : '100%';

  return (
    <ol className="relative mx-auto mt-6 flex w-full max-w-md items-start justify-between">
      <div className="absolute left-0 right-0 top-3.5 h-0.5 -translate-y-1/2 bg-ink-200" aria-hidden="true" />
      <div
        className="absolute left-0 top-3.5 h-0.5 -translate-y-1/2 bg-positive transition-[width] duration-500 ease-out"
        style={{ width: larguraPreenchida }}
        aria-hidden="true"
      />

      {ETAPAS.map((etapa, indice) => {
        const concluida = progresso >= etapa.valor;
        return (
          <li key={etapa.valor} className="relative z-10 flex flex-col items-center gap-2">
            <span
              className={[
                'grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition-colors duration-300',
                concluida
                  ? 'bg-positive text-on-fill shadow-raised'
                  : 'bg-surface text-ink-500 ring-1 ring-ink-200',
              ].join(' ')}
            >
              {concluida ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : indice + 1}
            </span>
            <span className={`text-[11px] font-medium ${concluida ? 'text-ink-700' : 'text-ink-500'}`}>
              {etapa.rotulo}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

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
  // Fila de atendimento por prioridade (triagem): recurso do atendente.
  const [ordemPrioridade, setOrdemPrioridade] = useState(false);

  const [modalMode, setModalMode] = useState(null);
  const [detailProtocolo, setDetailProtocolo] = useState(null);
  // Data-limite real do protocolo aberto no modal, calculada pelo
  // servidor com os feriados nacionais do ano.
  const [prazoLimite, setPrazoLimite] = useState(null);
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
          ordem: ordemPrioridade ? 'prioridade' : undefined,
          limite: 50,
        });
        if (ehValida()) setProtocolos(resposta.dados);
      } catch (error) {
        if (ehValida()) setErroCarregamento(error.message);
      } finally {
        if (ehValida()) setCarregando(false);
      }
    },
    [filtroStatus, ordemPrioridade]
  );

  useEffect(() => {
    let ativo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados na montagem/troca de filtro
    carregarProtocolos(() => ativo);
    return () => {
      ativo = false;
    };
  }, [carregarProtocolos]);

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

  // Converte o prazo da etapa ("20 dias úteis") na data em que ele vence.
  // Quem conta os dias é o servidor, que conhece os feriados nacionais.
  useEffect(() => {
    if (!detailProtocolo || detailProtocolo.progresso >= 100) return undefined;

    const dias = getStatusOpcao(detailProtocolo.progresso).diasUteis;
    if (!dias) return undefined;

    const abertura = detailProtocolo.abertoEm
      ? new Date(detailProtocolo.abertoEm).toISOString().slice(0, 10)
      : undefined;

    let ativo = true;
    obterPrazo(dias, abertura)
      // O id viaja junto para a tela nunca mostrar o prazo de outro protocolo
      // enquanto a consulta do atual ainda está a caminho.
      .then((dados) => ativo && setPrazoLimite({ ...dados, paraId: detailProtocolo.id }))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [detailProtocolo]);

  // Comprovante em PDF: o documento que o cidadao guarda ou apresenta
  // no atendimento presencial.
  const exportarComprovante = (prot) => {
    const etapa = getStatusOpcao(prot.progresso);

    const campos = [
      ['Número do protocolo', prot.id],
      ['Tipo de solicitação', prot.tipo],
      ['Situação atual', prot.status],
      ['Aberto em', formatarData(prot.abertoEm)],
    ];

    if (prazoLimite?.paraId === prot.id) {
      campos.push(['Prazo de resposta', `${formatarData(prazoLimite.vencimento)} (${prazoLimite.diasUteis} dias úteis)`]);
    } else if (etapa.diasUteis) {
      campos.push(['Prazo de resposta', `${etapa.diasUteis} dias úteis`]);
    }

    if (prot.concluidoEm) {
      campos.push(['Concluído em', formatarData(prot.concluidoEm)]);
    }

    campos.push(['Solicitante', user?.nome ?? '—']);

    novoRelatorio({
      titulo: 'Comprovante de protocolo',
      subtitulo: `Registro da solicitação ${prot.id} na plataforma VidaReal.`,
    })
      .secao('Dados da solicitação')
      .campos(campos)
      .secao('Descrição registrada')
      .paragrafo(prot.descricao || 'Nenhuma descrição registrada.')
      .nota(
        'Documento gerado automaticamente pela plataforma a partir dos dados do ' +
        'protocolo. Prazos em dias úteis desconsideram fins de semana e feriados ' +
        'nacionais (fonte: BrasilAPI).'
      )
      .salvar(`protocolo-${prot.id}.pdf`);

    showSuccess('Comprovante gerado. Confira a pasta de downloads.');
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
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <Toast notification={notification} onClose={clear} />

      <main className="mx-auto max-w-4xl px-4 py-10 pb-28 sm:px-6">
        <PageHeader
          title="Acompanhamento de protocolos"
          description={
            ehAtendente
              ? 'Painel do atendente: todas as solicitações abertas na plataforma.'
              : 'Acompanhe suas solicitações do pedido à conclusão.'
          }
        >
          <Button icon={Plus} onClick={openCreateModal}>
            Abrir protocolo
          </Button>
        </PageHeader>

        {/* Filtro por status — consulta o servidor a cada troca */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {['', ...STATUS_OPCOES.map((o) => o.status)].map((valor) => {
            const ativo = filtroStatus === valor;
            return (
              <button
                key={valor || 'todos'}
                type="button"
                onClick={() => setFiltroStatus(valor)}
                className={[
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150',
                  ativo
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-900',
                ].join(' ')}
              >
                {valor || 'Todos'}
              </button>
            );
          })}

          {ehAtendente && (
            <button
              type="button"
              onClick={() => setOrdemPrioridade((atual) => !atual)}
              aria-pressed={ordemPrioridade}
              title="Pendentes primeiro, da maior para a menor prioridade"
              className={[
                'ml-auto flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150',
                ordemPrioridade
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-900',
              ].join(' ')}
            >
              <ArrowDownWideNarrow size={13} aria-hidden="true" />
              Ordenar por prioridade
            </button>
          )}

          <button
            type="button"
            onClick={() => carregarProtocolos()}
            className={[
              // Quando o botão de ordenar existe, é ele quem empurra o grupo para a direita
              ehAtendente ? '' : 'ml-auto',
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900',
            ].join(' ')}
            title="Recarregar da API"
          >
            <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} aria-hidden="true" />
            Atualizar
          </button>
        </div>

        <div className="mt-6">
          {/* Estado: carregando */}
          {carregando && (
            <div className="grid place-items-center rounded-[var(--radius-card)] border border-ink-200 bg-surface px-6 py-16 text-center shadow-raised">
              <Loader2 size={26} className="animate-spin text-brand" aria-hidden="true" />
              <p className="mt-3 text-sm text-ink-500">Carregando protocolos...</p>
            </div>
          )}

          {/* Estado: falha */}
          {!carregando && erroCarregamento && (
            <div className="space-y-3">
              <StatusMessage type="error" message={erroCarregamento} />
              <Button variant="secondary" size="sm" onClick={() => carregarProtocolos()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Estado: sucesso, porém sem registros */}
          {!carregando && !erroCarregamento && protocolos.length === 0 && (
            <div className="grid place-items-center rounded-[var(--radius-card)] border border-dashed border-ink-300 bg-surface px-6 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-500">
                <FileText size={22} aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-base font-bold text-ink-900">
                Nenhum protocolo encontrado
              </h2>
              <p className="measure mt-1.5 text-sm text-ink-500">
                {filtroStatus
                  ? 'Nenhuma solicitação neste status. Tente outro filtro.'
                  : 'Abra seu primeiro protocolo para acompanhar o andamento por aqui.'}
              </p>
              {!filtroStatus && (
                <Button icon={Plus} size="sm" className="mt-5" onClick={openCreateModal}>
                  Abrir protocolo
                </Button>
              )}
            </div>
          )}

          {/* Estado: sucesso com dados */}
          {!carregando && !erroCarregamento && protocolos.length > 0 && (
            <ul className="space-y-4">
              {protocolos.map((prot) => (
                <li
                  key={prot.id}
                  className="group relative rounded-[var(--radius-card)] border border-ink-200 bg-surface p-5 shadow-raised transition-shadow duration-200 hover:shadow-lifted sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-brand-ink">
                        <FileText size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="tabular font-display text-[1.05rem] font-bold text-ink-900">
                          Protocolo {prot.id}
                        </h2>
                        <p className="mt-0.5 text-sm text-ink-700">{prot.tipo}</p>
                        <p className="mt-1 text-xs text-ink-500">
                          Aberto em {formatarData(prot.abertoEm)}
                        </p>
                        {prot.descricao && (
                          <p className="measure mt-2.5 line-clamp-2 text-sm leading-relaxed text-ink-600">
                            {prot.descricao}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                      <StatusBadge progresso={prot.progresso}>{prot.status}</StatusBadge>
                      {/* A API só envia a triagem para o atendente */}
                      <PrioridadeBadge nivel={prot.triagem?.prioridade} />

                      {/* Em telas de toque não existe hover: as ações ficam
                          sempre visíveis. A partir de sm elas recuam e
                          reaparecem no hover ou no foco por teclado. */}
                      <div className="flex gap-0.5 transition-opacity duration-200 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setDetailProtocolo(prot)}
                          className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-brand-soft hover:text-brand-ink"
                          title="Ver detalhes"
                        >
                          <Eye size={15} aria-hidden="true" />
                          <span className="sr-only">Ver detalhes do protocolo {prot.id}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(prot)}
                          className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-info-soft hover:text-info-ink"
                          title="Editar protocolo"
                        >
                          <Pencil size={15} aria-hidden="true" />
                          <span className="sr-only">Editar protocolo {prot.id}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(prot)}
                          className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-danger-soft hover:text-danger"
                          title="Excluir protocolo"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          <span className="sr-only">Excluir protocolo {prot.id}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <Trilha progresso={prot.progresso} />

                  {/* Tramitação rápida: exclusiva do atendente (RBAC) */}
                  {ehAtendente && prot.progresso < 100 && (
                    <div className="mt-5 flex justify-end border-t border-ink-100 pt-4">
                      <Button
                        variant="positive"
                        size="sm"
                        onClick={() => handleTramitar(prot, prot.progresso === 33 ? 66 : 100)}
                      >
                        {prot.progresso === 33 ? 'Iniciar análise' : 'Concluir protocolo'}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* -------------------- Modal: criar / editar -------------------- */}
      {modalMode === 'form' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/45 p-4 backdrop-blur-[2px]">
          <div className="surface-in max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[var(--radius-card)] bg-surface shadow-overlay">
            <div className="sticky top-0 flex items-center justify-between border-b border-ink-200 bg-surface px-6 py-4">
              <h2 className="font-display text-lg font-bold text-ink-900">
                {isEditing ? 'Editar protocolo' : 'Abrir novo protocolo'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
              >
                <X size={18} aria-hidden="true" />
                <span className="sr-only">Fechar</span>
              </button>
            </div>

            <form className="space-y-5 p-6" onSubmit={handleSubmit}>
              <FormField
                label="Tipo de protocolo"
                hint="A categoria direciona o atendimento ao setor responsável."
                required
                error={formErrors.tipo}
                htmlFor="tipo"
              >
                <select
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) => updateField('tipo', e.target.value)}
                  className={`${controlClass} ${fieldBorder(formErrors.tipo)}`}
                >
                  {PROTOCOLO_TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </FormField>

              {isEditing && ehAtendente && (
                <FormField
                  label="Status do protocolo"
                  hint="Atualize o andamento conforme o protocolo avança no fluxo."
                  required
                  error={formErrors.progresso}
                  htmlFor="progresso"
                >
                  <select
                    id="progresso"
                    value={formData.progresso}
                    onChange={(e) => updateField('progresso', Number(e.target.value))}
                    className={`${controlClass} ${fieldBorder(formErrors.progresso)}`}
                  >
                    {STATUS_OPCOES.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </FormField>
              )}

              <FormField
                label="Descrição da solicitação"
                hint="Inclua valores, prazos ou contexto relevante para agilizar a análise."
                required
                error={formErrors.descricao}
                counter={`${formData.descricao.trim().length} / mín. 10 caracteres`}
                htmlFor="descricao"
              >
                <textarea
                  id="descricao"
                  rows="4"
                  value={formData.descricao}
                  onChange={(e) => updateField('descricao', e.target.value)}
                  className={`${controlClass} ${fieldBorder(formErrors.descricao)} resize-none`}
                  placeholder="Ex.: gostaria de uma análise de viabilidade para acumular R$ 8.000 em 10 meses para reserva de emergência..."
                />
              </FormField>

              {/* Triagem inteligente: a IA sugere, o cidadão decide */}
              <SugestaoTriagem
                descricao={formData.descricao}
                tipoAtual={formData.tipo}
                onUsar={(tipo) => updateField('tipo', tipo)}
              />

              {erroFormulario && <StatusMessage type="error" message={erroFormulario} />}

              {!isEditing && !erroFormulario && (
                <p className="rounded-[var(--radius-field)] border border-ink-200 bg-ink-050 px-3.5 py-3 text-xs leading-relaxed text-ink-600">
                  O número do protocolo é gerado automaticamente e o andamento
                  fica disponível nesta página.
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" fullWidth onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" variant="positive" fullWidth loading={enviando}>
                  {enviando ? 'Enviando...' : isEditing ? 'Salvar alterações' : 'Enviar solicitação'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- Modal: detalhes -------------------- */}
      {detailProtocolo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/45 p-4 backdrop-blur-[2px]">
          <div className="surface-in max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[var(--radius-card)] bg-surface shadow-overlay">
            <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-ink-900">Detalhes do protocolo</h2>
              <button
                type="button"
                onClick={() => setDetailProtocolo(null)}
                className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
              >
                <X size={18} aria-hidden="true" />
                <span className="sr-only">Fechar</span>
              </button>
            </div>

            <dl className="divide-y divide-ink-100 px-6">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Número</dt>
                <dd className="tabular text-sm font-medium text-ink-900">{detailProtocolo.id}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Tipo</dt>
                <dd className="text-right text-sm font-medium text-ink-900">{detailProtocolo.tipo}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Status</dt>
                <dd>
                  <StatusBadge progresso={detailProtocolo.progresso}>
                    {detailProtocolo.status}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Aberto em</dt>
                <dd className="tabular text-sm font-medium text-ink-900">
                  {formatarData(detailProtocolo.abertoEm)}
                </dd>
              </div>
              {prazoLimite?.paraId === detailProtocolo.id && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Prazo de resposta
                  </dt>
                  <dd className="flex items-center gap-1.5 text-right text-sm font-medium text-ink-900">
                    <CalendarClock size={14} className="shrink-0 text-brand-ink" aria-hidden="true" />
                    <span className="tabular">{formatarData(prazoLimite.vencimento)}</span>
                    <span className="text-xs font-normal text-ink-500">
                      ({prazoLimite.diasUteis} dias úteis)
                    </span>
                  </dd>
                </div>
              )}
              {detailProtocolo.concluidoEm && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Concluído em
                  </dt>
                  <dd className="tabular text-sm font-medium text-ink-900">
                    {formatarData(detailProtocolo.concluidoEm)}
                  </dd>
                </div>
              )}
              <div className="py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Descrição</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink-700">
                  {detailProtocolo.descricao || 'Nenhuma descrição registrada.'}
                </dd>
              </div>

              {/* Triagem: informação interna, enviada pela API só ao atendente */}
              {detailProtocolo.triagem && (
                <div className="py-3">
                  <dt className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Prioridade
                    </span>
                    <PrioridadeBadge nivel={detailProtocolo.triagem.prioridade} />
                  </dt>
                  <dd className="mt-2 text-sm text-ink-700">
                    <p className="text-xs text-ink-500">
                      {detailProtocolo.triagem.pontos} ponto(s), por regras fixas:
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs leading-relaxed">
                      {detailProtocolo.triagem.motivos.map((motivo) => (
                        <li key={motivo}>{motivo}</li>
                      ))}
                    </ul>

                    <p className="mt-3 text-xs leading-relaxed text-ink-600">
                      <span className="font-semibold text-ink-800">Categoria sugerida pela IA:</span>{' '}
                      {detailProtocolo.triagem.tipoSugerido ? (
                        <>
                          {detailProtocolo.triagem.tipoSugerido} (confiança relativa de{' '}
                          {Math.round(detailProtocolo.triagem.confiancaSugestao * 100)}%) —{' '}
                          {detailProtocolo.triagem.sugestaoAceita
                            ? 'igual à escolhida pelo cidadão.'
                            : 'o cidadão escolheu outra categoria.'}
                        </>
                      ) : (
                        'sem sugestão para esta descrição.'
                      )}
                    </p>
                  </dd>
                </div>
              )}
            </dl>

            <div className="flex flex-wrap gap-3 border-t border-ink-200 bg-ink-050 p-4">
              <Button
                variant="secondary"
                fullWidth
                icon={Download}
                onClick={() => exportarComprovante(detailProtocolo)}
              >
                Exportar PDF
              </Button>
              <Button
                variant="secondary"
                fullWidth
                icon={Pencil}
                onClick={() => {
                  openEditModal(detailProtocolo);
                  setDetailProtocolo(null);
                }}
              >
                Editar
              </Button>
              <Button
                variant="danger"
                fullWidth
                icon={Trash2}
                onClick={() => {
                  setDeleteTarget(detailProtocolo);
                  setDetailProtocolo(null);
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Excluir protocolo"
        message={`O protocolo ${deleteTarget?.id} será removido permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
