// -----------------------------------------------------------------
// Montagem das rotas da API v1
//
// O versionamento no caminho (/api/v1) permite evoluir a API sem
// quebrar clientes já publicados — quando houver mudança incompatível,
// nasce a /api/v2 e as duas convivem durante a transição.
// -----------------------------------------------------------------

const express = require('express');

const { auditoria } = require('../store');
const { autenticar, autorizar } = require('../middlewares/auth');
const { paginacao } = require('../validators');

const router = express.Router();

// Health check: usado por monitoramento e pelo front para detectar
// se o backend está no ar antes de exibir erro ao usuário.
router.get('/health', (req, res) => {
  res.json({ status: 'ok', servico: 'HackGov VidaReal API', versao: '1.0.0' });
});

// Catálogo de endpoints (documentação viva da API).
router.get('/', (req, res) => {
  res.json({
    servico: 'HackGov VidaReal API',
    versao: '1.0.0',
    recursos: {
      auth: 'POST /api/v1/auth/login · GET /api/v1/auth/me · POST /api/v1/auth/logout',
      protocolos:
        'GET|POST /api/v1/protocolos · GET|PUT|DELETE /api/v1/protocolos/:id · ' +
        'PATCH /api/v1/protocolos/:id/status · GET /api/v1/protocolos/estatisticas',
      metas:
        'GET|POST /api/v1/metas · GET|PUT|DELETE /api/v1/metas/:id · PATCH /api/v1/metas/:id/aporte',
      feedbacks: 'POST /api/v1/feedbacks · GET /api/v1/feedbacks (atendente)',
      chat: 'POST /api/v1/chat',
      auditoria: 'GET /api/v1/auditoria (atendente)',
    },
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/protocolos', require('./protocolos.routes'));
router.use('/metas', require('./metas.routes'));
router.use('/feedbacks', require('./feedbacks.routes'));
router.use('/chat', require('./chat.routes'));

// ---------- Trilha de auditoria (governança) ----------
// Exclusiva do atendente: registra QUEM fez O QUÊ e QUANDO.
// A pilha é lida do topo (LIFO): ações mais recentes primeiro.
router.get('/auditoria', autenticar, autorizar('atendente'), (req, res) => {
  const { pagina, limite } = paginacao(req.query, { limitePadrao: 50 });
  const recentesPrimeiro = [...auditoria].reverse();
  const inicio = (pagina - 1) * limite;

  res.json({
    dados: recentesPrimeiro.slice(inicio, inicio + limite),
    paginacao: {
      pagina,
      limite,
      total: auditoria.length,
      totalPaginas: Math.max(1, Math.ceil(auditoria.length / limite)),
    },
  });
});

module.exports = router;
