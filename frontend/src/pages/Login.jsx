import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, FileText, TrendingUp, Target } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatarCpf, validarCpf, validarSenha } from '../utils/validators';
import FormField from '../components/FormField';
import { controlClass, fieldBorder } from '../utils/formStyles';
import ChecklistSenha from '../components/ChecklistSenha';
import StatusMessage from '../components/StatusMessage';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';
import VLibrasToggle from '../components/VLibrasToggle';

// Serviços citados no painel institucional — todos existentes na plataforma.
const destaques = [
  { icon: FileText, texto: 'Acompanhe seus protocolos do pedido à conclusão' },
  { icon: TrendingUp, texto: 'Simule o impacto da inflação no seu orçamento' },
  { icon: Target, texto: 'Planeje metas e descubra quanto guardar por mês' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erros, setErros] = useState({});
  const [status, setStatus] = useState(null); // loading | success | error

  const validarFormulario = () => {
    const novosErros = {};

    if (!cpf.trim()) novosErros.cpf = 'Informe seu CPF.';
    else if (!validarCpf(cpf)) novosErros.cpf = 'CPF inválido. Confira os dígitos informados.';

    if (!senha) novosErros.senha = 'Informe sua senha.';
    else {
      const erroSenha = validarSenha(senha);
      if (erroSenha) novosErros.senha = erroSenha;
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status?.type === 'loading') return;
    if (!validarFormulario()) return;

    setStatus({ type: 'loading', message: 'Verificando suas credenciais...' });

    try {
      const result = await login({ cpf, senha });
      setStatus({ type: 'success', message: `Bem-vindo(a), ${result.user.nome}!` });
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const carregando = status?.type === 'loading';

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* -------------------- Painel institucional -------------------- */}
      <aside className="relative hidden overflow-hidden bg-panel px-12 py-14 text-panel-strong lg:flex lg:flex-col lg:justify-between">
        {/* Luz quente saindo do canto, sem imagem externa */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 8% 0%, rgba(255,129,1,0.30) 0%, rgba(255,129,1,0.06) 42%, transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-display text-sm font-bold text-on-brand">
            VR
          </span>
          <span className="font-display text-base font-bold tracking-tight">
            Vida<span className="text-brand">Real</span>
          </span>
        </div>

        <div className="relative max-w-lg">
          <h1 className="font-display text-[2.6rem] font-bold leading-[1.08] tracking-tight text-panel-strong">
            Transparência pública e educação financeira ao alcance de todos.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-panel-muted">
            A plataforma digital do cidadão de Taubaté para acompanhar serviços
            públicos e cuidar do próprio orçamento.
          </p>

          <ul className="mt-10 space-y-4">
            {destaques.map(({ icon: Icon, texto }) => (
              <li key={texto} className="flex items-center gap-3.5 text-[0.95rem] text-panel-muted">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface/10 text-brand ring-1 ring-white/10">
                  <Icon size={17} aria-hidden="true" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-panel-dim">
          <ShieldCheck size={15} aria-hidden="true" />
          Seus dados são protegidos conforme a LGPD.
        </p>
      </aside>

      {/* -------------------- Formulário -------------------- */}
      <main className="relative flex items-center justify-center bg-canvas px-5 py-12 pb-40 sm:px-8 sm:pb-12">
        <div className="absolute right-4 top-4 flex items-center gap-1">
          <VLibrasToggle />
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[26rem]">
          {/* Marca compacta: aparece só quando o painel lateral está oculto */}
          <div className="mb-9 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-display text-sm font-bold text-on-brand shadow-raised">
              VR
            </span>
            <span className="font-display text-base font-bold tracking-tight text-ink-900">
              Vida<span className="text-brand-ink">Real</span>
            </span>
          </div>

          <h2 className="text-2xl font-bold text-ink-900">Acesse sua conta</h2>
          <p className="mt-2 text-sm text-ink-600">Entre com seu CPF para continuar.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <FormField label="CPF" required error={erros.cpf} htmlFor="cpf">
              <input
                id="cpf"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatarCpf(e.target.value))}
                maxLength={14}
                className={`${controlClass} ${fieldBorder(erros.cpf)} tabular`}
              />
            </FormField>

            <FormField label="Senha" required error={erros.senha} htmlFor="senha">
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  maxLength={64}
                  className={`${controlClass} ${fieldBorder(erros.senha)} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-2 text-ink-500 transition-colors hover:text-ink-700"
                  title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  <span className="sr-only">{mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}</span>
                </button>
              </div>

              <ChecklistSenha senha={senha} />
            </FormField>

            <p className="-mt-1 text-right text-sm">
              <Link to="/recuperar-senha" className="font-semibold text-brand-ink hover:underline">
                Esqueci minha senha
              </Link>
            </p>

            <StatusMessage type={status?.type} message={status?.message} />

            <Button type="submit" size="lg" fullWidth loading={carregando}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-600">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="font-semibold text-brand-ink hover:underline">
              Cadastre-se
            </Link>
          </p>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-500">
            <ShieldCheck size={14} aria-hidden="true" />
            Autenticação única e segura
          </p>
        </div>
      </main>
    </div>
  );
}
