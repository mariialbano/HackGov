import { simulateRequest } from './apiClient';

export function submitFeedback({ rating, comentario }) {
  return simulateRequest(() => {
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Por favor, selecione uma nota de 1 a 5 estrelas.');
    }

    return {
      success: true,
      message: `Obrigado pelo feedback! Nota: ${rating} estrela${rating > 1 ? 's' : ''}.`,
      rating,
      comentario: comentario || '',
    };
  });
}
