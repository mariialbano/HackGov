import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, TrendingUp, Target, MapPin, BarChart3, ArrowRight, Lightbulb, Plus,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ServiceCard from '../components/ServiceCard';
import { useAuth } from '../hooks/useAuth';
import { listarProtocolos } from '../api/protocoloService';

const ferramentasFinanceiras = [
  { title: 'Simulação de Inflação', desc: 'Veja quanto um valor custará no futuro pelo IPCA', icon: TrendingUp, path: '/inflacao' },
  { title: 'Metas Financeiras', desc: 'Descubra quanto guardar por mês para chegar lá', icon: Target, path: '/metas' },
];

const ferramentasTransparencia = [
  { title: 'Indicadores Municipais', desc: 'População, PIB, saneamento e educação da sua cidade', icon: MapPin, path: '/indicadores' },
  { title: 'Comparativo entre municípios', desc: 'Sua cidade frente a outra, com dados do IBGE', icon: BarChart3, path: '/comparativos', perfis: ['atendente'] },
];

function primeiroNome(nome) {
  return nome?.split(' ')[0] ?? '';
}

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [resumo, setResumo] = useState(null);

  // Painel de verdade mostra estado, não só atalhos: buscamos a situação
  // atual dos protocolos do cidadão logo na entrada.
  useEffect(() => {
    let ativo = true;

    listarProtocolos({ limite: 100 })
      .then((resposta) => {
        if (!ativo) return;
        const dados = resposta.dados;
        setResumo({
          total: dados.length,
          emAndamento: dados.filter((p) => p.progresso < 100).length,
          concluidos: dados.filter((p) => p.progresso === 100).length,
        });
      })
      .catch(() => {
        // O painel continua útil sem o resumo — nada de erro na cara do usuário.
        if (ativo) setResumo(null);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const transparenciaVisivel = ferramentasTransparencia.filter(
    (item) => !item.perfis || (user && item.perfis.includes(user.perfil))
  );

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 pb-28 sm:px-6 sm:py-12">
        <header className="surface-in">
          <p className="text-sm font-medium text-ink-500">{saudacao()},</p>
          <h1 className="mt-1 text-[2rem] font-bold leading-tight text-ink-900">
            {primeiroNome(user?.nome) || 'cidadão'}.
          </h1>
          <p className="measure mt-3 text-[0.95rem] leading-relaxed text-ink-600">
            Acompanhe seus serviços públicos e cuide do seu planejamento
            financeiro em um só lugar.
          </p>
        </header>

        {/* ---------- Protocolos: o serviço central, com estado real ---------- */}
        <section className="mt-9">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-surface shadow-raised">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand text-on-brand shadow-raised">
                  <FileText size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-ink-900">
                    Seus protocolos
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">
                    {resumo
                      ? resumo.total === 0
                        ? 'Você ainda não abriu nenhuma solicitação.'
                        : `${resumo.emAndamento} em andamento e ${resumo.concluidos} ${
                            resumo.concluidos === 1 ? 'concluído' : 'concluídos'
                          }.`
                      : 'Acompanhe suas solicitações do pedido à conclusão.'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 gap-2.5">
                <Link
                  to="/protocolos"
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-field)] border border-ink-200 bg-surface px-4 text-sm font-semibold text-ink-800 shadow-raised transition-colors hover:border-ink-300 hover:bg-ink-050"
                >
                  Ver todos
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link
                  to="/protocolos"
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-field)] bg-brand px-4 text-sm font-semibold text-on-brand shadow-raised transition-colors hover:bg-brand-strong"
                >
                  <Plus size={16} aria-hidden="true" />
                  Abrir protocolo
                </Link>
              </div>
            </div>

            {/* Barra de situação: só faz sentido quando há protocolos */}
            {resumo && resumo.total > 0 && (
              <div className="grid grid-cols-3 divide-x divide-ink-200 border-t border-ink-200 bg-ink-050">
                {[
                  { rotulo: 'Total', valor: resumo.total, cor: 'text-ink-900' },
                  { rotulo: 'Em andamento', valor: resumo.emAndamento, cor: 'text-brand-ink' },
                  { rotulo: 'Concluídos', valor: resumo.concluidos, cor: 'text-positive-ink' },
                ].map(({ rotulo, valor, cor }) => (
                  <div key={rotulo} className="px-6 py-4">
                    <p className={`tabular font-display text-xl font-bold ${cor}`}>{valor}</p>
                    <p className="mt-0.5 text-xs font-medium text-ink-500">{rotulo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ---------- Ferramentas ---------- */}
        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Planejamento financeiro
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {ferramentasFinanceiras.map((item) => (
              <ServiceCard key={item.path} {...item} />
            ))}
          </div>
        </section>

        <section className="mt-9">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Transparência e dados abertos
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {transparenciaVisivel.map((item) => (
              <ServiceCard key={item.path} {...item} />
            ))}
          </div>
        </section>

        {/* ---------- Sobre a plataforma ---------- */}
        <section className="mt-12 flex flex-col gap-4 border-t border-ink-200 pt-8 sm:flex-row">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
            <Lightbulb size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">
              Sobre o VidaReal
            </h2>
            <p className="measure mt-2 text-sm leading-relaxed text-ink-600">
              Plataforma de transformação digital focada em educação financeira,
              seguindo os pilares da OCDE de serviços orientados ao usuário e
              proatividade. Desenvolvida para promover transparência pública e
              conscientização, alinhada aos ODS da ONU e à Estratégia Nacional de
              Governo Digital (ENGD).
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
