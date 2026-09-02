// Serviço do recurso /perfil — consome a API RESTful.
// Todas as operações agem sobre o usuário da sessão: o alvo vem do token,
// nunca de um id na URL.

import { api } from './apiClient';

export function obterPerfil() {
  return api.get('/perfil');
}

export function atualizarPerfil({ nome, email }) {
  return api.put('/perfil', { nome, email });
}

// Trocar a senha encerra a sessão no servidor: o usuário precisa entrar
// de novo com a credencial nova.
export function trocarSenha({ senhaAtual, senhaNova }) {
  return api.patch('/perfil/senha', { senhaAtual, senhaNova });
}
