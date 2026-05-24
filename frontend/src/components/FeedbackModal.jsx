import React, { useState } from 'react';
import { X, Star } from 'lucide-react';

export default function FeedbackModal({ isOpen, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Obrigado pelo feedback! Nota: ${rating} estrelas.`);
    setRating(0);
    setComentario('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        
        {/* Header do Modal */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Avalie sua Experiência</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-3">Como foi sua experiência?</p>
            
            {/* Lógica das 5 Estrelas Interativas */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((index) => (
                <button
                  type="button"
                  key={index}
                  className="transition-transform duration-100 hover:scale-110 outline-none"
                  onClick={() => setRating(index)}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(0)}
                >
                  <Star
                    size={32}
                    className={`transition-colors duration-150 ${
                      index <= (hover || rating)
                        ? 'fill-gov-orange text-gov-orange'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Campo de Comentário Opcional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentário (opcional)
            </label>
            <textarea
              rows="4"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Conte-nos mais sobre sua experiência..."
              className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-sm outline-none focus:border-gov-orange focus:bg-white transition-all resize-none"
            ></textarea>
          </div>

          {/* Botões de Ação Inferiores */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={rating === 0}
              className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-xs ${
                rating === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gov-green text-white hover:bg-green-600'
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