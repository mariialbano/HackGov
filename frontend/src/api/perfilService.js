// Serviço do recurso /perfil — consome a API RESTful.
// Todas as operações agem sobre o usuário da sessão: o alvo vem do token,
// nunca de um id na URL.

import { api } from './apiClient';

export function obterPerfil() {
  return api.get('/perfil');
}

// `senhaAtual` só é exigida pelo servidor quando o e-mail muda: ele é o
// canal de recuperação de senha, e trocá-lo equivale a trocar a credencial.
export function atualizarPerfil({ nome, email, cep, cidade, senhaAtual }) {
  return api.put('/perfil', { nome, email, cep, cidade, senhaAtual });
}

// Trocar a senha encerra a sessão no servidor: o usuário precisa entrar
// de novo com a credencial nova.
export function trocarSenha({ senhaAtual, senhaNova }) {
  return api.patch('/perfil/senha', { senhaAtual, senhaNova });
}
