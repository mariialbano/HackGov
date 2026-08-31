// -----------------------------------------------------------------
// Recurso: /api/v1/protocolos  (recurso principal — CRUD completo)
//
//   GET    /protocolos               -> lista (filtros + paginação)   200
//   GET    /protocolos/estatisticas  -> indicadores do serviço        200
//   GET    /protocolos/:id           -> detalhe                       200 / 404
//   POST   /protocolos               -> cria                          201 + Location
//   PUT    /protocolos/:id           -> atualiza por completo         200 / 404
//   PATCH  /protocolos/:id/status    -> tramita (só atendente)        200 / 403
//   DELETE /protocolos/:id           -> exclui                        204 / 404
//
// Regra de acesso (LGPD + menor privilégio): o cidadão enxerga apenas
// os próprios protocolos; o atendente enxerga todos.
// -----------------------------------------------------------------

const express = require('express');

const store = require('../store');
const { protocolos, TIPOS_PROTOCOLO, STATUS_FLUXO, resolverStatus, registrarAuditoria } = store;
const { ApiError, asyncHandler } = require('../middlewares/errors');
const { autenticar, autorizar } = require('../middlewares/auth');
const { sanitizarTexto, Validador, paginacao } = require('../validators');

const router = express.Router();

// Todas as rotas deste recurso exigem autenticação.
router.use(autenticar);

// Monta a representação pública do protocolo (o que a API devolve).
function apresentar(protocolo) {
  const info = resolverStatus(protocolo.progresso);
  return {
    id: protocolo.id,
    tipo: protocolo.tipo,
    descricao: protocolo.descricao,
    status: info.status,
    progresso: protocolo.progresso,
    prazo: info.prazo,
    corPrazo: info.corPrazo,
    abertoEm: protocolo.abertoEm,
    concluidoEm: protocolo.concluidoEm,
    cpfSolicitante: protocolo.cpfSolicitante,
  };
}

function podeVer(usuario, protocolo) {
  return usuario.perfil === 'atendente' || protocolo.cpfSolicitante === usuario.cpf;
}

// Busca o protocolo e já aplica a regra de visibilidade.
// Devolve 404 (e não 403) quando o usuário não pode vê-lo: assim a API
// não confirma a existência de protocolos de outros cidadãos.
function buscarOu404(req) {
  const protocolo = protocolos.find((p) => p.id === req.params.id);
  if (!protocolo || !podeVer(req.usuario, protocolo)) {
    throw ApiError.notFound(`Protocolo ${req.params.id} não encontrado.`);
  }
  return protocolo;
}

function validarCorpo(body, { exigirProgresso = false } = {}) {
  const tipo = typeof body?.tipo === 'string' ? body.tipo.trim() : '';
  const descricao = sanitizarTexto(body?.descricao, 1000);
  const progresso = Number(body?.progresso);

  const validador = new Validador();
  validador
    .campo('tipo', TIPOS_PROTOCOLO.includes(tipo), `Deve ser um dos tipos: ${TIPOS_PROTOCOLO.join(' | ')}.`)
    .campo('descricao', descricao.length >= 10, 'Deve ter no mínimo 10 caracteres.');

  if (exigirProgresso) {
    validador.campo(
      'progresso',
      STATUS_FLUXO.some((s) => s.progresso === progresso),
      'Deve ser 33 (Criada), 66 (Em análise) ou 100 (Concluído).'
    );
  }

  validador.finalizar();
  return { tipo, descricao, progresso };
}

// ---------- GET /protocolos ----------
router.get('/', (req, res) => {
  const { status, tipo } = req.query;
  const { pagina, limite } = paginacao(req.query);

  let resultado = protocolos.filter((p) => podeVer(req.usuario, p));

  if (status) {
    resultado = resultado.filter(
      (p) => resolverStatus(p.progresso).status.toLowerCase() === String(status).toLowerCase()
    );
  }
  if (tipo) {
    resultado = resultado.filter((p) => p.tipo.toLowerCase().includes(String(tipo).toLowerCase()));
  }

  // Mais recentes primeiro
  resultado = [...resultado].sort((a, b) => new Date(b.abertoEm) - new Date(a.abertoEm));

  const total = resultado.length;
  const inicio = (pagina - 1) * limite;
  const itens = resultado.slice(inicio, inicio + limite).map(apresentar);

  res.json({
    dados: itens,
    paginacao: { pagina, limite, total, totalPaginas: Math.max(1, Math.ceil(total / limite)) },
  });
});

// ---------- GET /protocolos/estatisticas ----------
// Precisa vir ANTES de /:id, senão "estatisticas" seria lido como um id.
router.get('/estatisticas', (req, res) => {
  const visiveis = protocolos.filter((p) => podeVer(req.usuario, p));

  const porStatus = STATUS_FLUXO.reduce((acc, s) => {
    acc[s.status] = visiveis.filter((p) => p.progresso === s.progresso).length;
    return acc;
  }, {});

  const porTipo = TIPOS_PROTOCOLO.reduce((acc, t) => {
    const qtd = visiveis.filter((p) => p.tipo === t).length;
    if (qtd > 0) acc[t] = qtd;
    return acc;
  }, {});

  // Tempo de resolução (em dias) dos protocolos concluídos
  const tempos = visiveis
    .filter((p) => p.concluidoEm)
    .map((p) => (new Date(p.concluidoEm) - new Date(p.abertoEm)) / (1000 * 60 * 60 * 24));

  const media = tempos.length
    ? tempos.reduce((a, b) => a + b, 0) / tempos.length
    : 0;
  const variancia = tempos.length
    ? tempos.reduce((acc, t) => acc + (t - media) ** 2, 0) / tempos.length
    : 0;
  const ordenados = [...tempos].sort((a, b) => a - b);
  const mediana = ordenados.length
    ? ordenados.length % 2
      ? ordenados[(ordenados.length - 1) / 2]
      : (ordenados[ordenados.length / 2 - 1] + ordenados[ordenados.length / 2]) / 2
    : 0;

  const arredondar = (n) => Math.round(n * 100) / 100;

  res.json({
    total: visiveis.length,
    porStatus,
    porTipo,
    tempoResolucaoDias: {
      amostra: tempos.length,
      media: arredondar(media),
      mediana: arredondar(mediana),
      desvioPadrao: arredondar(Math.sqrt(variancia)),
      minimo: ordenados.length ? arredondar(ordenados[0]) : 0,
      maximo: ordenados.length ? arredondar(ordenados[ordenados.length - 1]) : 0,
    },
  });
});

// ---------- GET /protocolos/:id ----------
router.get('/:id', (req, res) => {
  res.json(apresentar(buscarOu404(req)));
});

// ---------- POST /protocolos ----------
router.post('/', (req, res) => {
  const { tipo, descricao } = validarCorpo(req.body);

  const novo = {
    id: store.gerarIdProtocolo(),
    cpfSolicitante: req.usuario.cpf,
    tipo,
    descricao,
    progresso: 33, // todo protocolo nasce em "Solicitação Criada"
    abertoEm: new Date().toISOString(),
    concluidoEm: null,
  };

  protocolos.push(novo);

  registrarAuditoria({
    acao: 'CRIAR_PROTOCOLO',
    recurso: 'protocolos',
    recursoId: novo.id,
    cpfAutor: req.usuario.cpf,
    perfilAutor: req.usuario.perfil,
  });

  res.status(201).location(`/api/v1/protocolos/${novo.id}`).json(apresentar(novo));
});

// ---------- PUT /protocolos/:id ----------
router.put('/:id', (req, res) => {
  const protocolo = buscarOu404(req);
  const { tipo, descricao, progresso } = validarCorpo(req.body, { exigirProgresso: true });

  // Só o atendente pode mover o protocolo no fluxo de atendimento.
  if (progresso !== protocolo.progresso && req.usuario.perfil !== 'atendente') {
    throw ApiError.forbidden('Apenas o atendente público pode alterar o status do protocolo.');
  }

  const anterior = resolverStatus(protocolo.progresso).status;

  protocolo.tipo = tipo;
  protocolo.descricao = descricao;
  protocolo.progresso = progresso;
  protocolo.concluidoEm = progresso === 100 ? protocolo.concluidoEm ?? new Date().toISOString() : null;

  registrarAuditoria({
    acao: 'ATUALIZAR_PROTOCOLO',
    recurso: 'protocolos',
    recursoId: protocolo.id,
    cpfAutor: req.usuario.cpf,
    perfilAutor: req.usuario.perfil,
    detalhe: `status: ${anterior} -> ${resolverStatus(progresso).status}`,
  });

  res.json(apresentar(protocolo));
});

// ---------- PATCH /protocolos/:id/status ----------
router.patch('/:id/status', autorizar('atendente'), (req, res) => {
  const protocolo = buscarOu404(req);
  const progresso = Number(req.body?.progresso);

  new Validador()
    .campo(
      'progresso',
      STATUS_FLUXO.some((s) => s.progresso === progresso),
      'Deve ser 33 (Criada), 66 (Em análise) ou 100 (Concluído).'
    )
    .finalizar();

  if (progresso === protocolo.progresso) {
    throw ApiError.conflict('O protocolo já está neste status.');
  }

  const anterior = resolverStatus(protocolo.progresso).status;
  protocolo.progresso = progresso;
  protocolo.concluidoEm = progresso === 100 ? new Date().toISOString() : null;

  registrarAuditoria({
    acao: 'ALTERAR_STATUS',
    recurso: 'protocolos',
    recursoId: protocolo.id,
    cpfAutor: req.usuario.cpf,
    perfilAutor: req.usuario.perfil,
    detalhe: `${anterior} -> ${resolverStatus(progresso).status}`,
  });

  res.json(apresentar(protocolo));
});

// ---------- DELETE /protocolos/:id ----------
router.delete('/:id', (req, res) => {
  const protocolo = buscarOu404(req);
  const indice = protocolos.indexOf(protocolo);
  protocolos.splice(indice, 1);

  registrarAuditoria({
    acao: 'EXCLUIR_PROTOCOLO',
    recurso: 'protocolos',
    recursoId: protocolo.id,
    cpfAutor: req.usuario.cpf,
    perfilAutor: req.usuario.perfil,
  });

  res.status(204).send(); // 204: sucesso sem corpo de resposta
});

module.exports = router;
