import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatarCpf, validarCpf, validarSenha, REQUISITOS_SENHA } from '../utils/validators';
import FormField from '../components/FormField';
import StatusMessage from '../components/StatusMessage';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erros, setErros] = useState({});
  const [status, setStatus] = useState(null); // { type: 'loading' | 'success' | 'error', message }

  const validarFormulario = () => {
    const novosErros = {};

    if (!cpf.trim()) {
      novosErros.cpf = 'Informe seu CPF.';
    } else if (!validarCpf(cpf)) {
      novosErros.cpf = 'CPF inválido. Confira os dígitos informados.';
    }

    if (!senha) {
      novosErros.senha = 'Informe sua senha.';
    } else {
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
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gov-orange">HackGov VidaReal</h1>
        <p className="text-gray-500 mt-2">Transformação digital ao seu alcance.</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6 text-gray-700">
          <LockKeyhole size={18} className="text-gov-orange" />
          <p className="font-medium">Acesse sua conta</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormField label="CPF" required error={erros.cpf}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="username"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatarCpf(e.target.value))}
              maxLength={14}
              className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gov-orange/40 transition ${
                erros.cpf ? 'border-red-400' : 'border-gray-200'
              }`}
            />
          </FormField>

          <FormField label="Senha" required error={erros.senha}>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                maxLength={64}
                className={`w-full border rounded-lg px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-gov-orange/40 transition ${
                  erros.senha ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Checklist da política de senha forte, atualizada em tempo real */}
            <ul className="mt-2 space-y-1" aria-label="Requisitos da senha">
              {REQUISITOS_SENHA.map((req) => {
                const ok = req.test(senha);
                return (
                  <li
                    key={req.id}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      ok ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {ok ? <Check size={14} className="shrink-0" /> : <X size={14} className="shrink-0" />}
                    {req.label}
                  </li>
                );
              })}
            </ul>
          </FormField>

          <StatusMessage type={status?.type} message={status?.message} />

          <button
            type="submit"
            disabled={status?.type === 'loading'}
            className="w-full bg-gov-orange text-white py-3 px-6 rounded-full font-bold text-lg hover:bg-orange-600 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status?.type === 'loading' ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Autenticação única e segura
        </p>
      </div>
    </div>
  );
}
