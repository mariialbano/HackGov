import { validarCpf, validarSenha, sanitizeText } from '../utils/validators';

// API de autenticação (Segurança da Informação)
// O login é processado no BACKEND (/api/login), onde as senhas são
// verificadas contra hashes bcrypt — nunca em texto puro.
//
// Contrato de integração:
//   sucesso -> { success: true, user: { nome, cpf, perfil }, token }
//   falha   -> HTTP 400/401 com { error: mensagem amigável }
//
// Perfis disponíveis:
//   'cidadao'   -> acesso às funcionalidades públicas do sistema
//   'atendente' -> acesso adicional a relatórios comparativos (área restrita)

const API_URL = 'http://localhost:3001';

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

  let response;
  try {
    response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: cpfLimpo, senha }),
    });
  } catch {
    throw new Error('Servidor indisponível. Verifique se o backend está rodando.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível fazer login. Tente novamente.');
  }

  return data;
}
