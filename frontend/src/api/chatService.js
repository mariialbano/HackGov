// Serviço do recurso /chat — consome a API RESTful (assistente com IA).
//
// Envia também a tela em que o cidadão está, para o assistente dar
// orientações contextuais. O perfil do usuário NÃO é enviado: o servidor
// o obtém da sessão, evitando que o cliente se passe por outro perfil.

import { api } from './apiClient';

export function sendMessage(message, { pagina } = {}) {
  return api.post('/chat', { message, pagina });
}
