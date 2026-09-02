import { useState } from 'react';
import { X, Star } from 'lucide-react';
import StatusMessage from './StatusMessage';
import { submitFeedback } from '../api/feedbackService';

export default function FeedbackModal({ isOpen, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [status, setStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setRating(0);
    setHover(0);
    setComentario('');
    setStatus(null);
    setStatusMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setStatusMessage('');

    if (!rating || rating < 1) {
      setStatus('error');
      setStatusMessage('Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }

    setStatus('loading');
    setStatusMessage('Enviando avaliação...');

    try {
      const result = await submitFeedback({ rating, comentario });
      setStatus('success');
      setStatusMessage(result.message);
      setRating(0);
      setComentario('');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error.message || 'Erro ao enviar avaliação. Tente novamente.');
    }
  };

  const isLoading = status === 'loading';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-surface rounded-[var(--radius-card)] shadow-overlay w-full max-w-md overflow-hidden border border-ink-200">
        
        {/* Header do Modal */}
        <div className="p-6 border-b border-ink-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-ink-900">Avalie sua Experiência</h2>
          <button onClick={handleClose} className="text-ink-500 hover:text-ink-600 transition-colors" disabled={isLoading}>
            <X size={22} />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-sm font-medium text-ink-600 mb-3">Como foi sua experiência?</p>
            
            {/* Lógica das 5 Estrelas Interativas */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((index) => (
                <button
                  type="button"
                  key={index}
                  className="transition-transform duration-100 hover:scale-110 outline-none"
                  onClick={() => {
                    setRating(index);
                    if (status === 'error') {
                      setStatus(null);
                      setStatusMessage('');
                    }
                  }}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(0)}
                  disabled={isLoading}
                >
                  <Star
                    size={32}
                    className={`transition-colors duration-150 ${
                      index <= (hover || rating)
                        ? 'fill-brand text-brand-ink'
                        : 'text-ink-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Campo de Comentário Opcional */}
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-2">
              Comentário (opcional)
            </label>
            <textarea
              rows="4"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Conte-nos mais sobre sua experiência..."
              disabled={isLoading}
              className="w-full border border-ink-200 bg-ink-050 rounded-[var(--radius-field)] p-3 text-sm outline-none focus:border-brand focus:bg-surface transition-all resize-none disabled:opacity-60"
            ></textarea>
          </div>

          <StatusMessage type={status} message={statusMessage} />

          {/* Botões de Ação Inferiores */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 bg-surface border border-ink-200 text-ink-800 font-medium py-3 rounded-[var(--radius-field)] hover:bg-ink-050 transition-colors disabled:opacity-60"
            >
              {status === 'success' ? 'Fechar' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={isLoading || status === 'success'}
              className={`flex-1 font-bold py-3 rounded-[var(--radius-field)] transition-all shadow-raised disabled:opacity-60 ${
                isLoading || status === 'success'
                  ? 'bg-ink-200 text-ink-500 cursor-not-allowed'
                  : 'bg-positive text-on-fill hover:bg-positive-ink'
              }`}
            >
              Enviar Avaliação
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
