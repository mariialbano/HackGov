import { simulateRequest } from './apiClient';

export function sendMessage(message) {
  return simulateRequest(() => ({
    reply: `Obrigado pela sua mensagem! Em relação a "${message}", recomendo consultar os indicadores de transparência e educação financeira disponíveis no HackGov VidaReal.`,
  }));
}
