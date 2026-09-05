import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatarCpf, validarCpf, validarSenha } from '../utils/validators';
import { controlClass, fieldBorder } from '../utils/formStyles';
import FormField from '../components/FormField';
import CampoCep from '../components/CampoCep';
import CampoSenha from '../components/CampoSenha';
import ChecklistSenha from '../components/ChecklistSenha';
import StatusMessage from '../components/StatusMessage';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';
import VLibrasToggle from '../components/VLibrasToggle';

const FORM_INICIAL = { nome: '', cpf: '', email: '', cep: '', cidade: '', senha: '', confirmacao: '' };

export default function Cadastro() {
  const navigate = useNavigate();
  const { cadastrar } = useAuth();

  const [form, setForm] = useState(FORM_INICIAL);
  const [erros, setErros] = useState({});
  const [status, setStatus] = useState(null);

  const alterar = (campo, valor) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const validar = () => {
    const novos = {};

    if (form.nome.trim().length < 3) {
      novos.nome = 'Informe seu nome completo (mínimo de 3 caracteres).';
    }

    if (!form.cpf.trim()) novos.cpf = 'Informe seu CPF.';
    else if (!validarCpf(form.cpf)) novos.cpf = 'CPF inválido. Confira os dígitos informados.';

    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(form.email.trim())) {
      novos.email = 'Informe um e-mail válido.';
    }

    const erroSenha = validarSenha(form.senha);
    if (erroSenha) novos.senha = erroSenha;

    if (form.confirmacao !== form.senha) {
      novos.confirmacao = 'As senhas não conferem.';
    }

    setErros(novos);
    return Object.keys(novos).length === 0;
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (status?.type === 'loading') return;
    if (!validar()) return;

    setStatus({ type: 'loading', message: 'Criando sua conta...' });

    try {
      const resultado = await cadastrar({
        nome: form.nome.trim(),
        cpf: form.cpf,
        email: form.email.trim(),
        senha: form.senha,
        cep: form.cep,
        cidade: form.cidade,
      });
      setStatus({ type: 'success', message: `Conta criada. Bem-vindo(a), ${resultado.user.nome}!` });
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (error) {
      // Erros de validação do servidor voltam para os campos que os geraram
      if (error.details?.length) {
        setErros((atual) => ({
          ...atual,
          ...error.details.reduce((acc, d) => ({ ...acc, [d.campo]: d.mensagem }), {}),
        }));
      }
      setStatus({ type: 'error', message: error.message });
    }
  };

  const carregando = status?.type === 'loading';

  return (
    <div className="min-h-screen bg-canvas">
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <VLibrasToggle />
        <ThemeToggle />
      </div>

      <main className="mx-auto flex min-h-screen max-w-[30rem] flex-col justify-center px-5 py-12 pb-40 sm:pb-12">
        <Link
          to="/"
          className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-brand-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para o login
        </Link>

        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-display text-sm font-bold text-on-brand shadow-raised">
            VR
          </span>
          <span className="font-display text-base font-bold tracking-tight text-ink-900">
            Vida<span className="text-brand-ink">Real</span>
          </span>
        </div>

        <h1 className="mt-7 text-2xl font-bold text-ink-900">Criar sua conta</h1>
        <p className="mt-2 text-sm text-ink-600">
          Cadastre-se para acompanhar seus protocolos e planejar suas metas.
        </p>

        <form onSubmit={enviar} noValidate className="mt-8 space-y-5">
          <FormField label="Nome completo" required error={erros.nome} htmlFor="nome">
            <input
              id="nome"
              type="text"
              autoComplete="name"
              placeholder="Como consta no seu documento"
              value={form.nome}
              onChange={(e) => alterar('nome', e.target.value)}
              maxLength={120}
              className={`${controlClass} ${fieldBorder(erros.nome)}`}
            />
          </FormField>

          <FormField label="CPF" required error={erros.cpf} htmlFor="cpf">
            <input
              id="cpf"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => alterar('cpf', formatarCpf(e.target.value))}
              maxLength={14}
              className={`${controlClass} ${fieldBorder(erros.cpf)} tabular`}
            />
          </FormField>

          <FormField
            label="E-mail"
            hint="Opcional. Usado apenas para avisos sobre seus protocolos."
            error={erros.email}
            htmlFor="email"
          >
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={form.email}
              onChange={(e) => alterar('email', e.target.value)}
              maxLength={200}
              className={`${controlClass} ${fieldBorder(erros.email)}`}
            />
          </FormField>

          <CampoCep
            cep={form.cep}
            cidade={form.cidade}
            aoMudar={({ cep, cidade }) =>
              setForm((atual) => ({ ...atual, cep, cidade }))
            }
          />

          <FormField label="Senha" required error={erros.senha} htmlFor="senha">
            <CampoSenha
              id="senha"
              valor={form.senha}
              aoMudar={(v) => alterar('senha', v)}
              erro={erros.senha}
              placeholder="Crie uma senha forte"
              autoComplete="new-password"
            />
            <ChecklistSenha senha={form.senha} />
          </FormField>

          <FormField label="Confirmar senha" required error={erros.confirmacao} htmlFor="confirmacao">
            <CampoSenha
              id="confirmacao"
              valor={form.confirmacao}
              aoMudar={(v) => alterar('confirmacao', v)}
              erro={erros.confirmacao}
              placeholder="Repita a senha"
              autoComplete="new-password"
            />
          </FormField>

          <StatusMessage type={status?.type} message={status?.message} />

          <Button type="submit" size="lg" fullWidth loading={carregando} icon={UserPlus}>
            {carregando ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-7 flex items-center justify-center gap-1.5 text-xs text-ink-500">
          <ShieldCheck size={14} aria-hidden="true" />
          Seus dados são protegidos conforme a LGPD.
        </p>
      </main>
    </div>
  );
}
