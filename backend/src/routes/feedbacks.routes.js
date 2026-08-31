// -----------------------------------------------------------------
// Recurso: /api/v1/feedbacks
//
//   POST /feedbacks  -> cidadão envia avaliação        201
//   GET  /feedbacks  -> consolidado (só atendente)     200 / 403
//
// O envio é público (não exige login) para não criar barreira à
// avaliação do serviço; a leitura é restrita ao atendente.
// -----------------------------------------------------------------

const express = require('express');

const store = require('../store');
const { feedbacks, registrarAuditoria } = store;
const { autenticar, autorizar } = require('../middlewares/auth');
const { sanitizarTexto, Validador } = require('../validators');

const router = express.Router();

router.post('/', (req, res) => {
  const rating = Number(req.body?.rating);
  const comentario = sanitizarTexto(req.body?.comentario, 500);

  new Validador()
    .campo(
      'rating',
      Number.isInteger(rating) && rating >= 1 && rating <= 5,
      'Deve ser um número inteiro de 1 a 5.'
    )
    .finalizar('Não foi possível registrar o feedback.');

  const novo = {
    id: store.proximoIdFeedback(),
    rating,
    comentario,
    registradoEm: new Date().toISOString(),
  };

  feedbacks.push(novo);

  registrarAuditoria({
    acao: 'CRIAR_FEEDBACK',
    recurso: 'feedbacks',
    recursoId: String(novo.id),
    detalhe: `nota ${rating}`,
  });

  res.status(201).location(`/api/v1/feedbacks/${novo.id}`).json({
    success: true,
    message: `Obrigado pelo feedback! Nota: ${rating} estrela${rating > 1 ? 's' : ''}.`,
    feedback: novo,
  });
});

router.get('/', autenticar, autorizar('atendente'), (req, res) => {
  const total = feedbacks.length;
  const media = total ? feedbacks.reduce((acc, f) => acc + f.rating, 0) / total : 0;

  const distribuicao = [1, 2, 3, 4, 5].reduce((acc, nota) => {
    acc[nota] = feedbacks.filter((f) => f.rating === nota).length;
    return acc;
  }, {});

  res.json({
    dados: feedbacks,
    resumo: { total, media: Math.round(media * 100) / 100, distribuicao },
  });
});

module.exports = router;
