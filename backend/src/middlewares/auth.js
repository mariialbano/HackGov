// -----------------------------------------------------------------
// Autenticação e autorização da API
//
// autenticar  -> exige um Bearer token válido        (401 se faltar/inválido)
// autorizar   -> exige que o perfil esteja na lista  (403 se não estiver)
//
// Separar os dois é intencional: 401 significa "não sei quem você é";
// 403 significa "sei quem você é, mas você não pode".
// -----------------------------------------------------------------

const { sessoes } = require('../store');
const { ApiError } = require('./errors');

function autenticar(req, res, next) {
  const header = req.get('Authorization') || '';
  const [esquema, token] = header.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Envie o token no cabeçalho: Authorization: Bearer <token>.'));
  }

  const sessao = sessoes.get(token);
  if (!sessao) {
    return next(ApiError.unauthorized('Sessão inválida ou expirada. Faça login novamente.'));
  }

  req.usuario = sessao.usuario;
  req.token = token;
  next();
}

// Autenticação opcional: se houver um token válido, identifica o usuário;
// caso contrário, segue como anônimo. Usado em rotas públicas que ficam
// mais úteis quando sabem quem está do outro lado (ex.: o assistente).
function autenticarOpcional(req, res, next) {
  const header = req.get('Authorization') || '';
  const [esquema, token] = header.split(' ');

  if (esquema === 'Bearer' && token) {
    const sessao = sessoes.get(token);
    if (sessao) {
      req.usuario = sessao.usuario;
      req.token = token;
    }
  }

  next();
}

function autorizar(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(ApiError.unauthorized());
    }
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return next(
        ApiError.forbidden(
          `Esta operação é exclusiva do perfil: ${perfisPermitidos.join(', ')}.`
        )
      );
    }
    next();
  };
}

// Limitador de tentativas por IP — mitiga força bruta no login.
// Em produção usaríamos Redis; aqui um Map em memória é suficiente.
function criarRateLimit({ limite, janelaMs, mensagem }) {
  const tentativas = new Map();

  return (req, res, next) => {
    const chave = req.ip;
    const agora = Date.now();
    const registro = tentativas.get(chave);

    if (!registro || agora > registro.expiraEm) {
      tentativas.set(chave, { contador: 1, expiraEm: agora + janelaMs });
      return next();
    }

    registro.contador += 1;
    if (registro.contador > limite) {
      const segundos = Math.ceil((registro.expiraEm - agora) / 1000);
      res.set('Retry-After', String(segundos));
      return next(ApiError.tooManyRequests(mensagem));
    }

    next();
  };
}

module.exports = { autenticar, autenticarOpcional, autorizar, criarRateLimit };
