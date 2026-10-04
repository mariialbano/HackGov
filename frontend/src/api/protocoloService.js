// Serviço do recurso /protocolos — consome a API RESTful.
// As telas chamam estas funções e nunca montam URLs por conta própria.

import { api } from './apiClient';

// `ordem: 'prioridade'` devolve a fila de atendimento (só para o atendente).
export function listarProtocolos({ status, tipo, ordem, pagina, limite } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (tipo) params.set('tipo', tipo);
  if (ordem) params.set('ordem', ordem);
  if (pagina) params.set('pagina', pagina);
  if (limite) params.set('limite', limite);

  const query = params.toString();
  return api.get(`/protocolos${query ? `?${query}` : ''}`);
}

export function obterProtocolo(id) {
  return api.get(`/protocolos/${id}`);
}

// Triagem inteligente: categoria sugerida pela IA para a descrição digitada.
// Devolve { sugestao: { tipo, confianca, nivel, termos } | null, motivo, ... }.
export function sugerirTipo(descricao) {
  return api.post('/protocolos/sugestao', { descricao });
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
