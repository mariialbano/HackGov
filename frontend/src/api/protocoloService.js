// Serviço do recurso /protocolos — consome a API RESTful.
// As telas chamam estas funções e nunca montam URLs por conta própria.

import { api } from './apiClient';

export function listarProtocolos({ status, tipo, pagina, limite } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (tipo) params.set('tipo', tipo);
  if (pagina) params.set('pagina', pagina);
  if (limite) params.set('limite', limite);

  const query = params.toString();
  return api.get(`/protocolos${query ? `?${query}` : ''}`);
}

export function obterProtocolo(id) {
  return api.get(`/protocolos/${id}`);
}

export function criarProtocolo({ tipo, descricao }) {
  return api.post('/protocolos', { tipo, descricao });
}

export function atualizarProtocolo(id, { tipo, descricao, progresso }) {
  return api.put(`/protocolos/${id}`, { tipo, descricao, progresso });
}

// Tramitação do protocolo — exclusiva do perfil atendente.
export function alterarStatus(id, progresso) {
  return api.patch(`/protocolos/${id}/status`, { progresso });
}

export function excluirProtocolo(id) {
  return api.delete(`/protocolos/${id}`);
}

export function obterEstatisticas() {
  return api.get('/protocolos/estatisticas');
}
