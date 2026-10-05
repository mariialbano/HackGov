import { api } from './apiClient';
import { validarCpf, validarSenha, sanitizeText } from '../utils/validators';

// Serviço do recurso /auth — consome a API RESTful.
//
// O login é processado no BACKEND (POST /api/v1/auth/login), onde as
// senhas são verificadas contra hashes bcrypt — nunca em texto puro.
//
// Contrato de integração:
//   sucesso -> { success: true, token, user: { nome, cpf, perfil } }
//   falha   -> HTTP 400/401/429 com { error: { code, message } }
//
// Perfis disponíveis:
//   'cidadao'   -> acesso às funcionalidades públicas do sistema
//   'atendente' -> acesso adicional a relatórios comparativos e à
//                  tramitação de protocolos (área restrita)

export async function login({ cpf, senha }) {
  // Pré-validação no cliente: feedback imediato e menos requisições
  // inválidas — mas a validação que vale é a do servidor.
  const cpfLimpo = sanitizeText(String(cpf), 14).replace(/\D/g, '');

  if (!validarCpf(cpfLimpo)) {
    throw new Error('CPF inválido. Verifique os dígitos informados.');
  }

  const erroSenha = validarSenha(senha);
  if (erroSenha) {
    throw new Error(erroSenha);
  }

  return api.post('/auth/login', { cpf: cpfLimpo, senha }, { auth: false });
}

// Cria uma conta de cidadão e já devolve a sessão aberta.
// O perfil é sempre "cidadao": o de atendente é concedido pela gestão,
// nunca escolhido por quem se cadastra.
export function cadastrar({ nome, cpf, email, senha, cep, cidade }) {
  const cpfLimpo = sanitizeText(String(cpf), 14).replace(/\D/g, '');

  if (!validarCpf(cpfLimpo)) {
    throw new Error('CPF inválido. Verifique os dígitos informados.');
  }

  return api.post('/auth/cadastro', { nome, cpf: cpfLimpo, email, senha, cep, cidade }, { auth: false });
}

// "Esqueci minha senha", passo 1. A resposta é a mesma para qualquer CPF
// válido: o servidor não revela se existe conta.
export function solicitarRecuperacao(cpf) {
  const cpfLimpo = sanitizeText(String(cpf), 14).replace(/\D/g, '');
  return api.post('/auth/recuperacao', { cpf: cpfLimpo }, { auth: false });
}

// Passo 2: troca a senha usando o token recebido na mensagem.
export function redefinirSenha({ token, senhaNova, confirmacao }) {
  return api.post('/auth/recuperacao/confirmar', { token, senhaNova, confirmacao }, { auth: false });
}

// Encerra a sessão no servidor, invalidando o token.
export function logout() {
  return api.post('/auth/logout');
}

// Confirma se o token guardado ainda é válido.
export function obterUsuarioAtual() {
  return api.get('/auth/me');
}
