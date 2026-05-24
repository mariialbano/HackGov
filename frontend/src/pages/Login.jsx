import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  // Simula o fluxo OAuth do GOV.BR
  const handleGovLogin = () => {
    // No futuro, aqui entraria a URL real de autenticação do governo
    navigate('/dashboard'); 
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col items-center justify-center p-4">
      {/* Cabeçalho de texto conforme imagem */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gov-orange">HackGov VidaReal</h1>
        <p className="text-gray-500 mt-2">Transformação digital ao seu alcance.</p>
      </div>

      {/* Card Central branco com sombra suave */}
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-md text-center">
        <p className="text-gray-700 mb-6">Acesse sua conta</p>
        
        {/* Botão Gov.br Laranja conforme design */}
        <button 
          onClick={handleGovLogin}
          className="w-full bg-gov-orange text-white py-3 px-6 rounded-full font-bold text-lg hover:bg-orange-600 transition shadow-md flex items-center justify-center gap-2"
        >
          Entrar com Gov.br
        </button>
        
        <p className="text-xs text-gray-400 mt-6">Autenticação única e segura</p>
      </div>
    </div>
  );
}