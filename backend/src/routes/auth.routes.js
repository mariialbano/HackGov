// -----------------------------------------------------------------
// Recurso: /api/v1/auth
//   POST   /login    -> autentica e devolve o token de sessão
//   GET    /me       -> dados do usuário autenticado
//   POST   /logout   -> encerra a sessão (invalida o token)
// -----------------------------------------------------------------

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { usuarios, HASH_FALSO, sessoes, registrarAuditoria } = require('../store');
const { ApiError, asyncHandler } = require('../middlewares/errors');
const { autenticar, criarRateLimit } = require('../middlewares/auth');
const { validarCpf } = require('../validators');

const router = express.Router();

// Máx. 5 tentativas de login por IP a cada 15 minutos.
const limitarLogin = criarRateLimit({
  limite: 5,
  janelaMs: 15 * 60 * 1000,
  mensagem: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
});

router.post(
  '/login',
  limitarLogin,
  asyncHandler(async (req, res) => {
    const { cpf, senha } = req.body ?? {};

    if (typeof cpf !== 'string' || typeof senha !== 'string') {
      throw ApiError.badRequest('Os campos "cpf" e "senha" são obrigatórios.', [
        { campo: 'cpf', mensagem: 'Obrigatório (texto).' },
        { campo: 'senha', mensagem: 'Obrigatório (texto).' },
      ]);
    }

    const cpfDigitos = cpf.replace(/\D/g, '');

    // Mensagem genérica de propósito: não revelar se o CPF existe
    // no sistema (evita enumeração de usuários).
    const credenciaisInvalidas = ApiError.unauthorized('CPF ou senha incorretos.');

    if (!validarCpf(cpfDigitos) || senha.length < 8 || senha.length > 64) {
      throw credenciaisInvalidas;
    }

    const usuario = usuarios.find((u) => u.cpf === cpfDigitos);
    const senhaConfere = await bcrypt.compare(senha, usuario ? usuario.senhaHash : HASH_FALSO);

    if (!usuario || !senhaConfere) {
      registrarAuditoria({
        acao: 'LOGIN_FALHOU',
        recurso: 'auth',
        detalhe: 'Tentativa de autenticação recusada',
      });
      throw credenciaisInvalidas;
    }

    // Em produção seria um JWT assinado; aqui, um token opaco de sessão.
    const token = crypto.randomBytes(32).toString('hex');
    const dadosPublicos = { nome: usuario.nome, cpf: usuario.cpf, perfil: usuario.perfil };

    sessoes.set(token, { usuario: dadosPublicos, criadaEm: new Date().toISOString() });

    registrarAuditoria({
      acao: 'LOGIN',
      recurso: 'auth',
      cpfAutor: usuario.cpf,
      perfilAutor: usuario.perfil,
    });

    res.json({ success: true, token, user: dadosPublicos });
  })
);

router.get('/me', autenticar, (req, res) => {
  res.json({ user: req.usuario });
});

router.post('/logout', autenticar, (req, res) => {
  sessoes.delete(req.token);
  registrarAuditoria({
    acao: 'LOGOUT',
    recurso: 'auth',
    cpfAutor: req.usuario.cpf,
    perfilAutor: req.usuario.perfil,
  });
  res.status(204).send();
});

module.exports = router;
