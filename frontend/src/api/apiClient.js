// -----------------------------------------------------------------
// Cliente HTTP da API VidaReal (módulo próprio, isolado das telas)
//
// Centraliza tudo que é comum a qualquer chamada:
//   - URL base e versão da API;
//   - envio automático do token de autenticação (Bearer);
//   - normalização de erros: qualquer falha vira um ApiError com
//     mensagem amigável, para as telas só precisarem de try/catch.
//
// Se a API mudar de endereço ou de esquema de autenticação, muda aqui
// e nenhuma tela precisa ser alterada.
// -----------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API = `${BASE_URL}/api/v1`;

const SESSION_KEY = 'hackgov.session';

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function obterToken() {
  try {
    const bruto = sessionStorage.getItem(SESSION_KEY);
    return bruto ? JSON.parse(bruto).token : null;
  } catch {
    return null;
  }
}

// Nenhuma chamada pode travar a interface indefinidamente: passado o
// tempo limite, a requisição é abortada e vira um erro tratável.
const TIMEOUT_MS = 30000;

async function request(caminho, { method = 'GET', body, auth = true } = {}) {
  const token = auth ? obterToken() : null;

  let resposta;
  try {
    resposta = await fetch(`${API}${caminho}`, {
      method,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (erro) {
    if (erro.name === 'TimeoutError' || erro.name === 'AbortError') {
      throw new ApiError('O servidor demorou demais para responder. Tente novamente.', {
        code: 'TIMEOUT',
      });
    }
    // Falha de rede: o backend não está no ar ou não há conexão.
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique se o backend está rodando.',
      { code: 'NETWORK_ERROR' }
    );
  }

  // 204 No Content (ex.: DELETE bem-sucedido) não tem corpo.
  if (resposta.status === 204) return null;

  let dados = null;
  const texto = await resposta.text();
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = null;
    }
  }

  if (!resposta.ok) {
    const erro = dados?.error;

    // 401 numa rota autenticada significa que a sessão não vale mais: token
    // expirado, servidor reiniciado ou senha trocada em outro lugar. Nesse
    // caso o certo é devolver o cidadão ao login, não mostrar a mensagem
    // técnica do protocolo ("Envie o token no cabeçalho...") no meio da tela.
    //
    // A exceção é o próprio login: ali o 401 quer dizer "credenciais
    // incorretas" e precisa aparecer no formulário.
    if (resposta.status === 401 && auth) {
      try {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem('hackgov.lastActivity');
      } catch {
        // Armazenamento bloqueado: segue para o redirecionamento assim mesmo.
      }
      window.dispatchEvent(new CustomEvent('vidareal:sessao-expirada'));
      throw new ApiError('Sua sessão expirou. Entre novamente para continuar.', {
        status: 401,
        code: 'SESSAO_EXPIRADA',
      });
    }

    throw new ApiError(erro?.message || 'Erro inesperado ao comunicar com o servidor.', {
      status: resposta.status,
      code: erro?.code,
      details: erro?.details,
    });
  }

  return dados;
}

export const api = {
  get: (caminho, opcoes) => request(caminho, { ...opcoes, method: 'GET' }),
  post: (caminho, body, opcoes) => request(caminho, { ...opcoes, method: 'POST', body }),
  put: (caminho, body, opcoes) => request(caminho, { ...opcoes, method: 'PUT', body }),
  patch: (caminho, body, opcoes) => request(caminho, { ...opcoes, method: 'PATCH', body }),
  delete: (caminho, opcoes) => request(caminho, { ...opcoes, method: 'DELETE' }),
};
