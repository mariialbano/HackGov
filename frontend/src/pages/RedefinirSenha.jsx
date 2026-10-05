import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TelaAcesso from '../components/TelaAcesso';
import FormField from '../components/FormField';
import CampoSenha from '../components/CampoSenha';
import ChecklistSenha from '../components/ChecklistSenha';
import StatusMessage from '../components/StatusMessage';
import Button from '../components/Button';
import { validarSenha } from '../utils/validators';
import { redefinirSenha } from '../api/authService';

// "Esqueci minha senha", passo 2: quem chega pelo link da mensagem escolhe
// a nova senha. O token vem na URL (?token=...) e só é conferido pelo
// servidor, no envio.
export default function RedefinirSenha() {
  const navigate = useNavigate();

  // Lido uma única vez, na montagem.
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');

  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState({});
  const [status, setStatus] = useState(null); // loading | success | error
  const [linkRecusado, setLinkRecusado] = useState(false);

  // Tira o token da barra de endereço e do histórico do navegador: ele já
  // está guardado na memória da página e não precisa ficar exposto ali.
  useEffect(() => {
    if (token) window.history.replaceState(null, '', window.location.pathname);
  }, [token]);

  const enviar = async (e) => {
    e.preventDefault();
    if (status?.type === 'loading' || status?.type === 'success') return;

    const novosErros = {};
    const erroSenha = validarSenha(senhaNova);
    if (erroSenha) novosErros.senhaNova = erroSenha;
    if (!confirmacao) novosErros.confirmacao = 'Repita a nova senha.';
    else if (confirmacao !== senhaNova) novosErros.confirmacao = 'A confirmação não confere com a nova senha.';

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setStatus({ type: 'loading', message: 'Salvando a nova senha...' });

    try {
      await redefinirSenha({ token, senhaNova, confirmacao });
      setStatus({ type: 'success', message: 'Senha redefinida. Entre com a nova senha.' });
      setTimeout(() => navigate('/'), 1800);
    } catch (error) {
      if (error.details?.length) {
        setErros(error.details.reduce((acc, d) => ({ ...acc, [d.campo]: d.mensagem }), {}));
      }
      if (error.code === 'TOKEN_INVALIDO') setLinkRecusado(true);
      setStatus({ type: 'error', message: error.message });
    }
  };

  const pedirNovoLink = (
    <p className="mt-6 text-center text-sm text-ink-600">
      <Link to="/recuperar-senha" className="font-semibold text-brand-ink hover:underline">
        Solicitar um novo link
      </Link>
    </p>
  );

  if (!token) {
    return (
      <TelaAcesso
        titulo="Link incompleto"
        descricao="Esta página precisa ser aberta pelo link recebido na mensagem de recuperação."
      >
        <div className="mt-8">
          <StatusMessage
            type="error"
            message="O link não trouxe o código de recuperação. Copie o endereço inteiro da mensagem ou peça um novo."
          />
        </div>
        {pedirNovoLink}
      </TelaAcesso>
    );
  }

  const carregando = status?.type === 'loading';

  return (
    <TelaAcesso
      titulo="Escolha uma nova senha"
      descricao="O link vale por poucos minutos e uma única vez. Depois de salvar, as sessões abertas com a senha antiga são encerradas."
    >
      <form onSubmit={enviar} noValidate className="mt-8 space-y-5">
        <FormField label="Nova senha" required error={erros.senhaNova} htmlFor="senhaNova">
          <CampoSenha
            id="senhaNova"
            valor={senhaNova}
            aoMudar={(valor) => {
              setSenhaNova(valor);
              if (erros.senhaNova) setErros((atual) => ({ ...atual, senhaNova: undefined }));
            }}
            erro={erros.senhaNova}
            placeholder="Digite a nova senha"
            autoComplete="new-password"
          />
          <ChecklistSenha senha={senhaNova} />
        </FormField>

        <FormField label="Confirmar nova senha" required error={erros.confirmacao} htmlFor="confirmacao">
          <CampoSenha
            id="confirmacao"
            valor={confirmacao}
            aoMudar={(valor) => {
              setConfirmacao(valor);
              if (erros.confirmacao) setErros((atual) => ({ ...atual, confirmacao: undefined }));
            }}
            erro={erros.confirmacao}
            placeholder="Repita a nova senha"
            autoComplete="new-password"
          />
        </FormField>

        <StatusMessage type={status?.type} message={status?.message} />

        <Button type="submit" size="lg" fullWidth loading={carregando} disabled={status?.type === 'success'}>
          {carregando ? 'Salvando...' : 'Salvar nova senha'}
        </Button>
      </form>

      {linkRecusado && pedirNovoLink}
    </TelaAcesso>
  );
}
