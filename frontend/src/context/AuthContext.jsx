import { useState, useEffect } from 'react';
import { AuthContext } from './contextoAuth';
import * as authService from '../api/authService';

// Contexto de autenticação (Segurança da Informação)
// Mantém a sessão do usuário logado e expõe login/logout para o app.
// A sessão é guardada em sessionStorage: expira ao fechar a aba,
// reduzindo o risco de sessão esquecida em computador compartilhado.
// Além disso, a sessão expira após período de inatividade (US06).


const SESSION_KEY = 'hackgov.session';
const ACTIVITY_KEY = 'hackgov.lastActivity';
const INATIVIDADE_LIMITE_MS = 15 * 60 * 1000; // 15 minutos sem interação
const INTERVALO_VERIFICACAO_MS = 30 * 1000;

function carregarSessao() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(carregarSessao);

  // Guarda a sessão devolvida pelo servidor (login ou cadastro).
  const abrirSessao = (result) => {
    const novaSessao = { user: result.user, token: result.token };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(novaSessao));
    sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    setSession(novaSessao);
    return result;
  };

  const login = async (credentials) => abrirSessao(await authService.login(credentials));

  // O cadastro já entra com a conta criada, sem pedir login em seguida.
  const cadastrar = async (dados) => abrirSessao(await authService.cadastrar(dados));

  // Atualiza os dados exibidos (navbar, saudação) após editar o perfil.
  const atualizarUsuario = (dadosUsuario) => {
    setSession((atual) => {
      if (!atual) return atual;
      const atualizada = { ...atual, user: { ...atual.user, ...dadosUsuario } };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(atualizada));
      return atualizada;
    });
  };

  const logout = () => {
    // Invalida o token também no servidor (POST /auth/logout).
    // Se a chamada falhar, a sessão local é encerrada mesmo assim.
    authService.logout().catch(() => {});
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ACTIVITY_KEY);
    setSession(null);
  };

  // Expiração por inatividade: qualquer interação renova o prazo;
  // sem interação por 15 minutos, a sessão é encerrada.
  useEffect(() => {
    if (!session) return undefined;

    const registrarAtividade = () =>
      sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));

    const eventos = ['click', 'keydown', 'scroll'];
    eventos.forEach((e) => window.addEventListener(e, registrarAtividade));

    const verificador = setInterval(() => {
      const ultimaAtividade = Number(sessionStorage.getItem(ACTIVITY_KEY) || 0);
      if (Date.now() - ultimaAtividade > INATIVIDADE_LIMITE_MS) {
        logout();
      }
    }, INTERVALO_VERIFICACAO_MS);

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, registrarAtividade));
      clearInterval(verificador);
    };
  }, [session]);

  const value = {
    user: session?.user ?? null,
    isAuthenticated: Boolean(session),
    login,
    cadastrar,
    atualizarUsuario,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
