import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import TelaAcesso from '../components/TelaAcesso';
import FormField from '../components/FormField';
import StatusMessage from '../components/StatusMessage';
import Button from '../components/Button';
import { controlClass, fieldBorder } from '../utils/formStyles';
import { formatarCpf, validarCpf } from '../utils/validators';
import { solicitarRecuperacao } from '../api/authService';

// "Esqueci minha senha", passo 1: o cidadão informa o CPF.
//
// A tela mostra a mesma confirmação para qualquer CPF válido. Dizer "CPF
// não encontrado" transformaria este formulário em um consultor de quem
// tem conta na plataforma.
export default function RecuperarSenha() {
  const [cpf, setCpf] = useState('');
  const [erroCpf, setErroCpf] = useState(null);
  const [status, setStatus] = useState(null); // loading | error
  const [confirmacao, setConfirmacao] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    if (status?.type === 'loading') return;

    if (!cpf.trim()) {
      setErroCpf('Informe seu CPF.');
      return;
    }
    if (!validarCpf(cpf)) {
      setErroCpf('CPF inválido. Confira os dígitos informados.');
      return;
    }
    setErroCpf(null);
    setStatus({ type: 'loading', message: 'Enviando o pedido...' });

    try {
      const resposta = await solicitarRecuperacao(cpf);
      setStatus(null);
      setConfirmacao(resposta.message);
    } catch (error) {
      const noCampo = error.details?.find((d) => d.campo === 'cpf');
      if (noCampo) setErroCpf(noCampo.mensagem);
      setStatus({ type: 'error', message: error.message });
    }
  };

  if (confirmacao) {
    return (
      <TelaAcesso
        titulo="Confira seu e-mail"
        descricao="O pedido foi registrado. Abra o link do e-mail para escolher uma nova senha."
      >
        <div
          role="status"
          className="mt-8 flex items-start gap-2.5 rounded-[var(--radius-field)] border border-positive/25 bg-positive-soft px-3.5 py-3 text-sm font-medium leading-snug text-positive-ink"
        >
          <MailCheck size={17} className="mt-px shrink-0" aria-hidden="true" />
          <span>{confirmacao}</span>
        </div>

        <ul className="mt-4 list-disc space-y-1 rounded-[var(--radius-field)] border border-ink-200 bg-ink-050 py-3 pl-8 pr-3.5 text-xs leading-relaxed text-ink-600">
          <li>O e-mail vai para o endereço cadastrado na conta e pode levar alguns minutos.</li>
          <li>Se não aparecer na caixa de entrada, confira a pasta de spam.</li>
          <li>Se a conta não tiver e-mail cadastrado, nenhuma mensagem é enviada.</li>
        </ul>

        <p className="mt-6 text-center text-sm text-ink-600">
          <Link to="/" className="font-semibold text-brand-ink hover:underline">
            Voltar para o login
          </Link>
        </p>
      </TelaAcesso>
    );
  }

  return (
    <TelaAcesso
      titulo="Esqueci minha senha"
      descricao="Informe o CPF da sua conta. Enviaremos um link para o e-mail cadastrado, para você escolher uma nova senha."
    >
      <form onSubmit={enviar} noValidate className="mt-8 space-y-5">
        <FormField label="CPF" required error={erroCpf} htmlFor="cpf">
          <input
            id="cpf"
            type="text"
            inputMode="numeric"
            autoComplete="username"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => {
              setCpf(formatarCpf(e.target.value));
              if (erroCpf) setErroCpf(null);
            }}
            maxLength={14}
            className={`${controlClass} ${fieldBorder(erroCpf)} tabular`}
          />
        </FormField>

        <StatusMessage type={status?.type} message={status?.message} />

        <Button type="submit" size="lg" fullWidth loading={status?.type === 'loading'}>
          {status?.type === 'loading' ? 'Enviando...' : 'Enviar link de recuperação'}
        </Button>
      </form>
    </TelaAcesso>
  );
}
