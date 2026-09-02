import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Send, Star, Sparkles } from 'lucide-react';
import { sendMessage } from '../api/chatService';

export default function ChatbotIA({ onOpenFeedback }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text:
        'Olá! Posso ajudar você a usar a plataforma e tirar dúvidas sobre finanças. ' +
        'O que você precisa?',
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { pathname } = useLocation(); // tela atual, enviada como contexto

  // Rola até a última mensagem sempre que a conversa cresce
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendMessage(userMessage.text, { pagina: pathname });
      setMessages((prev) => [...prev, { text: data.reply, sender: 'bot' }]);
    } catch (error) {
      // Mostra o motivo real (servidor fora do ar, IA lenta) em vez de
      // uma mensagem genérica que não ajuda o cidadão.
      setMessages((prev) => [
        ...prev,
        {
          text: error.message || 'Não consegui responder agora. Tente novamente em instantes.',
          sender: 'bot',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Avaliação da experiência */}
      <button
        onClick={onOpenFeedback}
        type="button"
        className="grid h-12 w-12 place-items-center rounded-full bg-positive text-on-fill shadow-lifted transition-transform duration-200 hover:scale-105 active:scale-95"
        title="Avalie sua experiência"
      >
        <Star size={20} className="fill-white" aria-hidden="true" />
        <span className="sr-only">Avalie sua experiência</span>
      </button>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          type="button"
          className="grid h-14 w-14 place-items-center rounded-full bg-brand text-on-brand shadow-lifted transition-colors duration-200 hover:bg-brand-strong"
          title="Abrir assistente virtual"
        >
          <MessageSquare size={23} aria-hidden="true" />
          <span className="sr-only">Abrir assistente virtual</span>
        </button>
      )}

      {isOpen && (
        <section className="surface-in flex h-[30rem] w-[21rem] flex-col overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-surface shadow-overlay sm:w-[23rem]">
          <header className="flex items-center justify-between gap-3 border-b border-ink-200 bg-surface px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand-ink">
                <Sparkles size={17} aria-hidden="true" />
              </span>
              <div className="leading-tight">
                <h2 className="font-display text-sm font-bold text-ink-900">Assistente Virtual</h2>
                <p className="text-xs text-ink-500">Plataforma e finanças</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
              title="Fechar"
            >
              <X size={17} aria-hidden="true" />
              <span className="sr-only">Fechar assistente</span>
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-ink-050 p-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* whitespace-pre-line preserva as quebras de linha do texto */}
                <p
                  className={[
                    'max-w-[85%] whitespace-pre-line px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.sender === 'user'
                      ? 'rounded-2xl rounded-br-md bg-brand text-on-brand'
                      : 'rounded-2xl rounded-bl-md border border-ink-200 bg-surface text-ink-800 shadow-raised',
                  ].join(' ')}
                >
                  {msg.text}
                </p>
              </div>
            ))}

            {/* Digitando: três pontos em cascata, não um spinner genérico */}
            {loading && (
              <div className="flex justify-start">
                <span className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-ink-200 bg-surface px-4 py-3.5 shadow-raised">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-400"
                      style={{ animationDelay: `${i * 0.16}s` }}
                    />
                  ))}
                  <span className="sr-only">Assistente digitando</span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-ink-200 bg-surface p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..."
              aria-label="Mensagem para o assistente"
              className="h-11 flex-1 rounded-[var(--radius-field)] border border-ink-200 bg-surface px-3.5 text-sm text-ink-900 placeholder:text-ink-500 transition-colors focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              type="button"
              disabled={loading || !input.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-field)] bg-brand text-on-brand transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-ink-300"
              title="Enviar mensagem"
            >
              <Send size={17} aria-hidden="true" />
              <span className="sr-only">Enviar</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
