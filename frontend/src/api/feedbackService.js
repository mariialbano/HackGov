// Serviço do recurso /feedbacks — consome a API RESTful.
// O envio não exige autenticação (auth: false): avaliar o serviço
// público não deve depender de o cidadão estar logado.

import { api } from './apiClient';

export function submitFeedback({ rating, comentario }) {
  return api.post('/feedbacks', { rating, comentario }, { auth: false });
}

// Consolidado das avaliações — restrito ao perfil atendente.
export function listarFeedbacks() {
  return api.get('/feedbacks');
}
