// -----------------------------------------------------------------
// Tratamento centralizado de erros
//
// Boa prática REST: toda falha responde no MESMO formato, com o status
// code correto. As rotas apenas lançam ApiError — quem monta a resposta
// é o middleware, evitando repetição de try/catch em cada endpoint.
//
// Formato do erro:
//   { "error": { "code": "NOT_FOUND", "message": "...", "details": [...] } }
// -----------------------------------------------------------------

class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Autenticação necessária.') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Você não tem permissão para acessar este recurso.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Recurso não encontrado.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message) {
    return new ApiError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message) {
    return new ApiError(429, 'TOO_MANY_REQUESTS', message);
  }
}

// Envolve handlers assíncronos para que exceções cheguem ao errorHandler
// sem precisar de try/catch em toda rota.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// 404 para rotas inexistentes (precisa vir depois de todas as rotas).
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars -- o Express exige os 4 parâmetros
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // JSON malformado no corpo da requisição
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'O corpo da requisição não é um JSON válido.' },
    });
  }

  // Erro inesperado: registra no log técnico do servidor, mas NUNCA
  // devolve stack trace ao cliente (evita exposição de dados internos).
  console.error('[erro inesperado]', err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor.' },
  });
}

module.exports = { ApiError, asyncHandler, notFoundHandler, errorHandler };
