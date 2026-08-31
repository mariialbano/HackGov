// -----------------------------------------------------------------
// Recurso: /api/v1/metas  (CRUD das metas financeiras do cidadão)
//
//   GET    /metas              -> lista as metas do usuário logado  200
//   GET    /metas/:id          -> detalhe                           200 / 404
//   POST   /metas              -> cria                              201 + Location
//   PUT    /metas/:id          -> atualiza                          200 / 404
//   PATCH  /metas/:id/aporte   -> registra um depósito              200 / 400
//   DELETE /metas/:id          -> exclui                            204 / 404
//
// Metas são dados financeiros pessoais: cada usuário acessa apenas as
// suas, inclusive o atendente (princípio da minimização — LGPD).
// -----------------------------------------------------------------

const express = require('express');

const store = require('../store');
const { metas, registrarAuditoria } = store;
const { ApiError } = require('../middlewares/errors');
const { autenticar } = require('../middlewares/auth');
const { sanitizarTexto, Validador } = require('../validators');

const router = express.Router();
router.use(autenticar);

function apresentar(meta) {
  const percentual = meta.objetivo > 0 ? (meta.atual / meta.objetivo) * 100 : 0;
  return {
    id: meta.id,
    tipo: meta.tipo,
    atual: meta.atual,
    objetivo: meta.objetivo,
    prazo: meta.prazo,
    percentual: Math.round(percentual * 10) / 10,
    restante: Math.max(0, meta.objetivo - meta.atual),
    concluida: meta.atual >= meta.objetivo,
  };
}

function buscarOu404(req) {
  const meta = metas.find(
    (m) => m.id === Number(req.params.id) && m.cpfUsuario === req.usuario.cpf
  );
  if (!meta) throw ApiError.notFound(`Meta ${req.params.id} não encontrada.`);
  return meta;
}

function validarCorpo(body) {
  const tipo = sanitizarTexto(body?.tipo, 60);
  const objetivo = Number(body?.objetivo);
  const prazo = sanitizarTexto(body?.prazo, 30);

  new Validador()
    .campo('tipo', tipo.length >= 2, 'Deve ter no mínimo 2 caracteres.')
    .campo('objetivo', Number.isFinite(objetivo) && objetivo > 0, 'Deve ser um número maior que zero.')
    .campo('prazo', prazo.length > 0, 'Obrigatório (ex.: "12 meses").')
    .finalizar();

  return { tipo, objetivo, prazo };
}

router.get('/', (req, res) => {
  const minhas = metas.filter((m) => m.cpfUsuario === req.usuario.cpf);
  res.json({ dados: minhas.map(apresentar), paginacao: { total: minhas.length } });
});

router.get('/:id', (req, res) => {
  res.json(apresentar(buscarOu404(req)));
});

router.post('/', (req, res) => {
  const { tipo, objetivo, prazo } = validarCorpo(req.body);
  const atualInformado = Number(req.body?.atual);

  const nova = {
    id: store.proximoIdMeta(),
    cpfUsuario: req.usuario.cpf,
    tipo,
    objetivo,
    prazo,
    atual: Number.isFinite(atualInformado) && atualInformado > 0 ? atualInformado : 0,
  };

  metas.push(nova);

  registrarAuditoria({
    acao: 'CRIAR_META',
    recurso: 'metas',
    recursoId: String(nova.id),
    cpfAutor: req.usuario.cpf,
    perfilAutor: req.usuario.perfil,
  });

  res.status(201).location(`/api/v1/metas/${nova.id}`).json(apresentar(nova));
});

router.put('/:id', (req, res) => {
  const meta = buscarOu404(req);
  const { tipo, objetivo, prazo } = validarCorpo(req.body);

  meta.tipo = tipo;
  meta.objetivo = objetivo;
  meta.prazo = prazo;

  registrarAuditoria({
    acao: 'ATUALIZAR_META',
    recurso: 'metas',
    recursoId: String(meta.id),
    cpfAutor: req.usuario.cpf,
    perfilAutor: req.usuario.perfil,
  });

  res.json(apresentar(meta));
});

router.patch('/:id/aporte', (req, res) => {
  const meta = buscarOu404(req);
  const valor = Number(req.body?.valor);

  new Validador()
    .campo('valor', Number.isFinite(valor) && valor > 0, 'Deve ser um número maior que zero.')
    .finalizar();

  meta.atual += valor;

  registrarAuditoria({
    acao: 'APORTE_META',
    recurso: 'metas',
    recursoId: String(meta.id),
    cpfAutor: req.usuario.cpf,
    perfilAutor: req.usuario.perfil,
    detalhe: `aporte de R$ ${valor.toFixed(2)}`,
  });

  res.json(apresentar(meta));
});

router.delete('/:id', (req, res) => {
  const meta = buscarOu404(req);
  metas.splice(metas.indexOf(meta), 1);

  registrarAuditoria({
    acao: 'EXCLUIR_META',
    recurso: 'metas',
    recursoId: String(meta.id),
    cpfAutor: req.usuario.cpf,
    perfilAutor: req.usuario.perfil,
  });

  res.status(204).send();
});

module.exports = router;
