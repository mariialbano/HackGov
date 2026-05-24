import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importando as Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Protocolos from './pages/Protocolos';
import Inflacao from './pages/Inflacao';
import Metas from './pages/Metas';
import Indicadores from './pages/Indicadores';
import Comparativos from './pages/Comparativos';

// Importando los Componentes Globais e o Novo Modal
import ChatbotIA from './components/ChatBotIA';
import FeedbackModal from './components/FeedbackModal';

function App() {
  // Estado para controlar a abertura do modal de estrelas
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota inicial: Tela de Login */}
        <Route path="/" element={<Login />} />
        
        {/* Rotas internas do sistema */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/protocolos" element={<Protocolos />} />
        <Route path="/inflacao" element={<Inflacao />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/indicadores" element={<Indicadores />} />
        <Route path="/comparativos" element={<Comparativos />} />
      </Routes>

      {/* Injeta a função de abrir o feedback ao clicar na estrela verde do chatbot */}
      <ChatbotIA onOpenFeedback={() => setIsFeedbackOpen(true)} />

      {/* Renderiza o Modal na tela se o estado for verdadeiro */}
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </BrowserRouter>
  );
}

export default App;