import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Save, ShieldCheck, UserCog } from 'lucide-react';
import Navbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import CampoCep from '../components/CampoCep';
import CampoSenha from '../components/CampoSenha';
import ChecklistSenha from '../components/ChecklistSenha';
import StatusMessage from '../components/StatusMessage';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { controlClass, fieldBorder } from '../utils/formStyles';
import { formatarCpf, validarSenha } from '../utils/validators';
import { obterPerfil, atualizarPerfil, trocarSenha } from '../api/perfilService';

export default function Perfil() {
  const navigate = useNavigate();
  const { user, atualizarUsuario, logout } = useAuth();
  const { notification, showSuccess, clear } = useToast();

  const [dados, setDados] = useState({ nome: '', email: '', cep: '', cidade: '' });
  const [errosDados, setErrosDados] = useState({});
  const [statusDados, setStatusDados] = useState(null);

  const [senhas, setSenhas] = useState({ senhaAtual: '', senhaNova: '', confirmacao: '' });
  const [errosSenha, setErrosSenha] = useState({});
  const [statusSenha, setStatusSenha] = useState(null);

  // GET /api/v1/perfil
  useEffect(() => {
    let ativo = true;

    obterPerfil()
      .then((resposta) => {
        if (!ativo) return;
        setDados({
          nome: resposta.user.nome,
          email: resposta.email ?? '',
          cep: resposta.cep ?? '',
          cidade: resposta.cidade ?? '',
        });
      })
      .catch((error) => {
        if (ativo) setStatusDados({ type: 'error', message: error.message });
      });

    return () => {
      ativo = false;
    };
  }, []);

  // PUT /api/v1/perfil
  const salvarDados = async (e) => {
    e.preventDefault();
    if (statusDados?.type === 'loading') return;

    const novos = {};
    if (dados.nome.trim().length < 3) {
      novos.nome = 'Informe seu nome completo (mínimo de 3 caracteres).';
    }
    if (dados.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(dados.email.trim())) {
      novos.email = 'Informe um e-mail válido.';
    }
    setErrosDados(novos);
    if (Object.keys(novos).length > 0) return;

    setStatusDados({ type: 'loading', message: 'Salvando...' });

    try {
      const resposta = await atualizarPerfil({
        nome: dados.nome.trim(),
        email: dados.email.trim(),
        cep: dados.cep,
        cidade: dados.cidade,
      });
      atualizarUsuario(resposta.user); // reflete o novo nome na navbar
      setStatusDados(null);
      showSuccess('Dados atualizados com sucesso.');
    } catch (error) {
      if (error.details?.length) {
        setErrosDados(error.details.reduce((acc, d) => ({ ...acc, [d.campo]: d.mensagem }), {}));
      }
      setStatusDados({ type: 'error', message: error.message });
    }
  };

  // PATCH /api/v1/perfil/senha
  const salvarSenha = async (e) => {
    e.preventDefault();
    if (statusSenha?.type === 'loading') return;

    const novos = {};
    if (!senhas.senhaAtual) novos.senhaAtual = 'Informe sua senha atual.';

    const erroNova = validarSenha(senhas.senhaNova);
    if (erroNova) novos.senhaNova = erroNova;

    if (senhas.confirmacao !== senhas.senhaNova) {
      novos.confirmacao = 'As senhas não conferem.';
    }

    setErrosSenha(novos);
    if (Object.keys(novos).length > 0) return;

    setStatusSenha({ type: 'loading', message: 'Alterando a senha...' });

    try {
      await trocarSenha({ senhaAtual: senhas.senhaAtual, senhaNova: senhas.senhaNova });
      setStatusSenha({
        type: 'success',
        message: 'Senha alterada. Entre novamente com a nova senha.',
      });
      // O servidor encerra a sessão ao trocar a senha; limpamos a local
      // e devolvemos o cidadão ao login.
      setTimeout(() => {
        logout();
        navigate('/');
      }, 1800);
    } catch (error) {
      if (error.details?.length) {
        setErrosSenha(error.details.reduce((acc, d) => ({ ...acc, [d.campo]: d.mensagem }), {}));
      }
      setStatusSenha({ type: 'error', message: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <Toast notification={notification} onClose={clear} />

      <main className="mx-auto max-w-3xl px-4 py-10 pb-28 sm:px-6">
        <PageHeader
          title="Seu perfil"
          description="Gerencie seus dados de cadastro e a segurança da sua conta."
        />

        {/* ---------- Identificação ---------- */}
        <section className="mt-8 rounded-[var(--radius-card)] border border-ink-200 bg-surface p-6 shadow-raised">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand-ink">
              <UserCog size={18} aria-hidden="true" />
            </span>
            <h2 className="font-display text-base font-bold text-ink-900">Dados pessoais</h2>
          </div>

          <form onSubmit={salvarDados} noValidate className="mt-6 space-y-5">
            <FormField label="Nome completo" required error={errosDados.nome} htmlFor="perfil-nome">
              <input
                id="perfil-nome"
                type="text"
                autoComplete="name"
                value={dados.nome}
                onChange={(e) => {
                  setDados((a) => ({ ...a, nome: e.target.value }));
                  if (errosDados.nome) setErrosDados((a) => ({ ...a, nome: undefined }));
                }}
                maxLength={120}
                className={`${controlClass} ${fieldBorder(errosDados.nome)}`}
              />
            </FormField>

            <FormField
              label="E-mail"
              hint="Opcional. Usado apenas para avisos sobre seus protocolos."
              error={errosDados.email}
              htmlFor="perfil-email"
            >
              <input
                id="perfil-email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={dados.email}
                onChange={(e) => {
                  setDados((a) => ({ ...a, email: e.target.value }));
                  if (errosDados.email) setErrosDados((a) => ({ ...a, email: undefined }));
                }}
                maxLength={200}
                className={`${controlClass} ${fieldBorder(errosDados.email)}`}
              />
            </FormField>

            <CampoCep
              id="perfil-cep"
              cep={dados.cep}
              cidade={dados.cidade}
              aoMudar={({ cep, cidade }) => setDados((a) => ({ ...a, cep, cidade }))}
            />

            {/* CPF e perfil identificam a conta e o papel: não são editáveis */}
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="CPF" hint="Não pode ser alterado.">
                <input
                  type="text"
                  value={formatarCpf(user?.cpf ?? '')}
                  disabled
                  className={`${controlClass} ${fieldBorder(false)} tabular`}
                />
              </FormField>

              <FormField label="Perfil de acesso" hint="Definido pela gestão pública.">
                <input
                  type="text"
                  value={user?.perfil === 'atendente' ? 'Atendente público' : 'Cidadão'}
                  disabled
                  className={`${controlClass} ${fieldBorder(false)}`}
                />
              </FormField>
            </div>

            {statusDados && <StatusMessage type={statusDados.type} message={statusDados.message} />}

            <div className="flex justify-end">
              <Button type="submit" icon={Save} loading={statusDados?.type === 'loading'}>
                Salvar alterações
              </Button>
            </div>
          </form>
        </section>

        {/* ---------- Segurança ---------- */}
        <section className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-surface p-6 shadow-raised">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand-ink">
              <KeyRound size={18} aria-hidden="true" />
            </span>
            <h2 className="font-display text-base font-bold text-ink-900">Alterar senha</h2>
          </div>

          <p className="measure mt-2 text-sm leading-relaxed text-ink-600">
            Por segurança, pedimos sua senha atual e encerramos a sessão após a
            troca — você entra de novo com a senha nova.
          </p>

          <form onSubmit={salvarSenha} noValidate className="mt-6 space-y-5">
            <FormField label="Senha atual" required error={errosSenha.senhaAtual} htmlFor="senha-atual">
              <CampoSenha
                id="senha-atual"
                valor={senhas.senhaAtual}
                aoMudar={(v) => {
                  setSenhas((a) => ({ ...a, senhaAtual: v }));
                  if (errosSenha.senhaAtual) setErrosSenha((a) => ({ ...a, senhaAtual: undefined }));
                }}
                erro={errosSenha.senhaAtual}
                placeholder="Sua senha de hoje"
              />
            </FormField>

            <FormField label="Nova senha" required error={errosSenha.senhaNova} htmlFor="senha-nova">
              <CampoSenha
                id="senha-nova"
                valor={senhas.senhaNova}
                aoMudar={(v) => {
                  setSenhas((a) => ({ ...a, senhaNova: v }));
                  if (errosSenha.senhaNova) setErrosSenha((a) => ({ ...a, senhaNova: undefined }));
                }}
                erro={errosSenha.senhaNova}
                placeholder="Crie uma senha forte"
                autoComplete="new-password"
              />
              <ChecklistSenha senha={senhas.senhaNova} />
            </FormField>

            <FormField
              label="Confirmar nova senha"
              required
              error={errosSenha.confirmacao}
              htmlFor="senha-confirmacao"
            >
              <CampoSenha
                id="senha-confirmacao"
                valor={senhas.confirmacao}
                aoMudar={(v) => {
                  setSenhas((a) => ({ ...a, confirmacao: v }));
                  if (errosSenha.confirmacao) setErrosSenha((a) => ({ ...a, confirmacao: undefined }));
                }}
                erro={errosSenha.confirmacao}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </FormField>

            {statusSenha && <StatusMessage type={statusSenha.type} message={statusSenha.message} />}

            <div className="flex justify-end">
              <Button type="submit" icon={KeyRound} loading={statusSenha?.type === 'loading'}>
                Alterar senha
              </Button>
            </div>
          </form>
        </section>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-500">
          <ShieldCheck size={14} aria-hidden="true" />
          Sua senha é guardada apenas como hash bcrypt — nem o sistema consegue lê-la.
        </p>
      </main>
    </div>
  );
}
