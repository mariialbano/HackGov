// Serviço do recurso /metas — consome a API RESTful.

import { api } from './apiClient';

export function listarMetas() {
  return api.get('/metas');
}

export function criarMeta({ tipo, objetivo, prazo, atual }) {
  return api.post('/metas', { tipo, objetivo, prazo, atual });
}

export function atualizarMeta(id, { tipo, objetivo, prazo }) {
  return api.put(`/metas/${id}`, { tipo, objetivo, prazo });
}

// Registra um depósito na meta (soma ao valor acumulado).
export function registrarAporte(id, valor) {
  return api.patch(`/metas/${id}/aporte`, { valor });
}

export function excluirMeta(id) {
  return api.delete(`/metas/${id}`);
}
