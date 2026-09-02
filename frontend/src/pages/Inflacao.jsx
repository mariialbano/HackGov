import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Save, Pencil, Trash2, X, FolderOpen } from 'lucide-react';

export default function Inflacao() {
  const [valor, setValor] = useState(1000);
  const [anos, setAnos] = useState(5);
  const [inflacao, setInflacao] = useState(4.5);

  const [simulacoes, setSimulacoes] = useState(() => {
    const saved = localStorage.getItem('hackgov_simulacoes');
    return saved ? JSON.parse(saved) : [];
  });

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [nomeSimulacao, setNomeSimulacao] = useState('');
  const [editingSimulacao, setEditingSimulacao] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const { notification, showSuccess, clear } = useToast();

  useEffect(() => {
    localStorage.setItem('hackgov_simulacoes', JSON.stringify(simulacoes));
  }, [simulacoes]);

  const valorNum = parseFloat(valor) || 0;
  const anosNum = parseInt(anos, 10) || 0;
  const inflacaoNum = parseFloat(inflacao) || 0;

  const valorFuturo = valorNum > 0 && anosNum >= 0
    ? (valorNum * Math.pow(1 + inflacaoNum / 100, anosNum)).toFixed(2)
    : '0.00';

  const data = Array.from({ length: Math.max(anosNum, 0) + 1 }, (_, i) => ({
    ano: `Ano ${i}`,
    valor: (valorNum * Math.pow(1 + inflacaoNum / 100, i)).toFixed(2),
  }));

  const crescimento = valorNum > 0 ? ((valorFuturo / valorNum - 1) * 100).toFixed(1) : '0.0';

  const openSaveModal = (simulacao = null) => {
    if (simulacao) {
      setEditingSimulacao(simulacao);
      setNomeSimulacao(simulacao.nome);
    } else {
      setEditingSimulacao(null);
      setNomeSimulacao('');
    }
    setFormErrors({});
    setSaveModalOpen(true);
  };

  const handleSaveSimulacao = (e) => {
    e.preventDefault();
    const nome = nomeSimulacao.trim();
    const errors = {};

    if (!nome) {
      errors.nome = 'O nome da simulação é obrigatório.';
    } else if (nome.length < 3) {
      errors.nome = 'O nome deve ter no mínimo 3 caracteres.';
    }

    if (valorNum <= 0) errors.geral = 'O valor atual deve ser maior que zero.';
    if (anosNum <= 0) errors.geral = errors.geral || 'O período deve ser maior que zero.';
    if (inflacaoNum < 0) errors.geral = errors.geral || 'A taxa de inflação não pode ser negativa.';

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      nome,
      valor: valorNum,
      anos: anosNum,
      inflacao: inflacaoNum,
      valorFuturo: parseFloat(valorFuturo),
      atualizadoEm: new Date().toLocaleDateString('pt-BR'),
    };

    if (editingSimulacao) {
      setSimulacoes((prev) =>
        prev.map((s) => (s.id === editingSimulacao.id ? { ...s, ...payload } : s))
      );
      showSuccess(`Simulação "${nome}" atualizada com sucesso.`);
    } else {
      setSimulacoes((prev) => [{ id: Date.now(), ...payload }, ...prev]);
      showSuccess(`Simulação "${nome}" salva com sucesso.`);
    }

    setSaveModalOpen(false);
    setNomeSimulacao('');
    setEditingSimulacao(null);
  };

  const handleLoadSimulacao = (sim) => {
    setValor(sim.valor);
    setAnos(sim.anos);
    setInflacao(sim.inflacao);
    showSuccess(`Simulação "${sim.nome}" carregada.`);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setSimulacoes((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    showSuccess(`Simulação "${deleteTarget.nome}" excluída com sucesso.`);
    setDeleteTarget(null);
  };

  const handleExportPdf = () => {
    showSuccess('Relatório preparado. Em produção, o PDF seria gerado e baixado automaticamente.');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <Toast notification={notification} onClose={clear} />

      <main className="mx-auto max-w-6xl px-4 py-10 pb-28 sm:px-6">
        <PageHeader
          title="Simulador de inflação"
          description="Projete o impacto da inflação no seu poder de compra ao longo do tempo."
        />

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="bg-surface p-6 rounded-[var(--radius-field)] shadow-raised border border-ink-200 h-fit">
            <h2 className="font-bold text-lg mb-4 text-brand-ink">Calculadora</h2>
            <div className="space-y-4">
              <FormField
                label="Valor Atual (R$)"
                hint="Quanto vale hoje o produto ou serviço que deseja simular."
                required
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full border p-2 rounded-lg focus:border-brand outline-none"
                />
              </FormField>

              <FormField
                label="Período (Anos)"
                hint="Por quantos anos deseja projetar o impacto inflacionário."
                required
              >
                <input
                  type="number"
                  min="1"
                  value={anos}
                  onChange={(e) => setAnos(e.target.value)}
                  className="w-full border p-2 rounded-lg focus:border-brand outline-none"
                />
              </FormField>

              <FormField
                label="Taxa de Inflação (% ao ano)"
                hint="Taxa anual estimada. O IPCA médio dos últimos anos gira em torno de 4% a 5%."
                required
              >
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={inflacao}
                  onChange={(e) => setInflacao(e.target.value)}
                  className="w-full border p-2 rounded-lg focus:border-brand outline-none"
                />
              </FormField>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => openSaveModal()}
                  className="flex-1 bg-positive text-on-fill py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-positive-ink transition font-medium text-sm"
                >
                  <Save size={16} /> Salvar
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="flex-1 bg-ink-100 text-ink-800 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-ink-200 transition text-sm"
                >
                  <Download size={16} /> Exportar PDF
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface p-4 rounded-[var(--radius-field)] border shadow-raised">
                <p className="text-sm text-ink-500">Poder de compra necessário</p>
                <h3 className="text-2xl font-bold text-brand-ink">R$ {parseFloat(valorFuturo).toLocaleString('pt-BR')}</h3>
                <p className="text-xs text-ink-500 mt-1">Valor equivalente após {anosNum} ano{anosNum !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-surface p-4 rounded-[var(--radius-field)] border shadow-raised">
                <p className="text-sm text-ink-500">Crescimento Nominal</p>
                <h3 className="text-2xl font-bold text-danger">+ {crescimento}%</h3>
                <p className="text-xs text-ink-500 mt-1">Aumento acumulado no período</p>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-[var(--radius-field)] border shadow-raised h-80">
              <h3 className="font-bold mb-4 text-ink-800">Projeção do Custo de Vida</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `R$ ${v}`} />
                  <Line type="monotone" dataKey="valor" stroke="#ff8101" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface p-6 rounded-[var(--radius-field)] border shadow-raised">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-ink-800">Simulações Salvas</h3>
                <span className="text-xs text-ink-500">{simulacoes.length} registro{simulacoes.length !== 1 ? 's' : ''}</span>
              </div>

              {simulacoes.length === 0 ? (
                <div className="text-center py-6">
                  <FolderOpen size={32} className="text-ink-300 mx-auto mb-2" />
                  <p className="text-sm text-ink-500">Nenhuma simulação salva ainda.</p>
                  <p className="text-xs text-ink-500 mt-1">Configure os parâmetros e clique em &quot;Salvar&quot; para guardar cenários.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {simulacoes.map((sim) => (
                    <div
                      key={sim.id}
                      className="flex items-center justify-between p-4 bg-ink-050 rounded-[var(--radius-field)] border border-ink-200 group hover:border-brand/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-ink-900 truncate">{sim.nome}</p>
                        <p className="text-xs text-ink-500 mt-0.5">
                          R$ {sim.valor.toLocaleString('pt-BR')} · {sim.anos} anos · {sim.inflacao}% a.a.
                        </p>
                        <p className="text-xs text-brand-ink font-medium mt-0.5">
                          Projeção: R$ {sim.valorFuturo.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadSimulacao(sim)}
                          className="p-2 text-ink-500 hover:text-brand-ink hover:bg-brand-soft rounded-lg transition-colors text-xs font-medium"
                          title="Carregar simulação"
                        >
                          <FolderOpen size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openSaveModal(sim)}
                          className="p-2 text-ink-500 hover:text-info-ink hover:bg-info-soft rounded-lg transition-colors"
                          title="Editar nome"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(sim)}
                          className="p-2 text-ink-500 hover:text-danger hover:bg-danger-soft rounded-lg transition-colors"
                          title="Excluir simulação"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-[var(--radius-card)] shadow-overlay w-full max-w-sm overflow-hidden border border-ink-200">
            <div className="bg-brand text-on-brand p-5 flex justify-between items-center">
              <h2 className="font-bold text-lg text-on-brand">{editingSimulacao ? 'Editar Simulação' : 'Salvar Simulação'}</h2>
              <button type="button" onClick={() => setSaveModalOpen(false)} className="hover:opacity-80">
                <X size={22} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleSaveSimulacao}>
              <FormField
                label="Nome da Simulação"
                hint="Dê um nome descritivo para identificar este cenário (ex: Reserva 2030, Custo moradia 5 anos)."
                required
                error={formErrors.nome}
              >
                <input
                  type="text"
                  value={nomeSimulacao}
                  onChange={(e) => {
                    setNomeSimulacao(e.target.value);
                    if (formErrors.nome) setFormErrors((prev) => ({ ...prev, nome: undefined }));
                  }}
                  placeholder="Ex: Projeção reserva de emergência"
                  className="w-full border-2 border-ink-200 rounded-[var(--radius-field)] p-3 bg-ink-050 text-sm outline-none focus:border-brand focus:bg-surface transition-all"
                />
              </FormField>

              {formErrors.geral && (
                <p className="text-xs text-danger-ink bg-danger-soft p-3 rounded-[var(--radius-field)] border border-danger/30">{formErrors.geral}</p>
              )}

              <p className="text-xs text-ink-500 bg-ink-050 p-3 rounded-[var(--radius-field)] border border-ink-200">
                Parâmetros: R$ {valorNum.toLocaleString('pt-BR')} · {anosNum} anos · {inflacaoNum}% a.a. → R$ {parseFloat(valorFuturo).toLocaleString('pt-BR')}
              </p>

              <button type="submit" className="w-full bg-positive text-on-fill font-bold py-3 rounded-[var(--radius-field)] hover:bg-positive-ink transition">
                {editingSimulacao ? 'Atualizar' : 'Salvar Simulação'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Excluir simulação"
        message={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
