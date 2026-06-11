import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Star } from 'lucide-react';
import { sendMessage } from '../api/chatService';

export default function ChatbotIA({ onOpenFeedback }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Olá! Sou o Assistente Virtual do HackGov VidaReal. Como posso ajudá-lo hoje?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendMessage(userMessage.text);
      setMessages(prev => [...prev, { text: data.reply, sender: 'bot' }]);
    } catch {
      setMessages(prev => [...prev, { text: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.", sender: 'bot' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      
      {/* Botão Flutuante Verde de Estrela (Feedback) */}
      <button 
        onClick={onOpenFeedback}
        type="button"
        className="bg-gov-green text-white p-3.5 rounded-full shadow-lg hover:scale-105 transition duration-200 active:scale-95"
        title="Avalie sua Experiência"
      >
        <Star size={22} className="fill-white" />
      </button>

      {/* Botão do Chatbot Laranja */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          type="button"
          className="bg-gov-orange text-white p-4 rounded-full shadow-lg hover:bg-orange-600 transition duration-200"
        >
          <MessageSquare size={26} />
        </button>
      )}

      {/* Caixa do Chatbot */}
      {isOpen && (
        <div className="bg-white w-80 sm:w-[350px] h-[480px] rounded-2xl shadow-2xl flex flex-col border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gov-orange text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold flex items-center gap-2"><MessageSquare size={18}/> Assistente Virtual</h3>
              <p className="text-xs opacity-90 mt-1">Suporte imediato ao cidadão</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:text-gray-200"><X size={20}/></button>
          </div>
          
          {/* Conversa */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.sender === 'user' ? 'bg-gov-orange text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border shadow-xs'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg border shadow-xs">
                  <Loader2 className="animate-spin text-gray-400" size={20} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Campo de Entrada */}
          <div className="p-3 bg-white border-t flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-gray-100 border border-gray-200 rounded-lg p-2.5 outline-none focus:border-gov-orange text-sm"
              disabled={loading}
            />
            <button 
              onClick={handleSend} 
              type="button"
              className={`p-3 rounded-lg text-white transition-colors ${loading ? 'bg-gray-300' : 'bg-gov-orange hover:bg-orange-600'}`}
              disabled={loading}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}