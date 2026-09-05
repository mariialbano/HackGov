import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importando as Páginas
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Perfil from './pages/Perfil';
import Dashboard from './pages/Dashboard';
import Protocolos from './pages/Protocolos';
import Inflacao from './pages/Inflacao';
import Metas from './pages/Metas';
import Indicadores from './pages/Indicadores';
import Comparativos from './pages/Comparativos';

// Importando os Componentes Globais e o Novo Modal
import ChatbotIA from './components/ChatBotIA';
import FeedbackModal from './components/FeedbackModal';
import ProtectedRoute from './components/ProtectedRoute';
import Rodape from './components/Rodape';
import { AuthProvider } from './context/AuthContext';

function App() {
  // Estado para controlar a abertura do modal de estrelas
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota inicial: Tela de Login */}
          <Route path="/" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          {/* Rotas internas: exigem usuário autenticado */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/protocolos" element={<ProtectedRoute><Protocolos /></ProtectedRoute>} />
          <Route path="/inflacao" element={<ProtectedRoute><Inflacao /></ProtectedRoute>} />
          <Route path="/metas" element={<ProtectedRoute><Metas /></ProtectedRoute>} />
          <Route path="/indicadores" element={<ProtectedRoute><Indicadores /></ProtectedRoute>} />

          {/* Área restrita: apenas perfil atendente (controle de acesso por perfis) */}
          <Route
            path="/comparativos"
            element={
              <ProtectedRoute perfis={['atendente']}>
                <Comparativos />
              </ProtectedRoute>
            }
          />
        </Routes>

        {/* Rodapé único para todas as telas internas (ele mesmo se oculta
            no login e no cadastro, que têm composição de tela cheia). */}
        <Rodape />

        {/* Injeta a função de abrir o feedback ao clicar na estrela verde do chatbot */}
        <ChatbotIA onOpenFeedback={() => setIsFeedbackOpen(true)} />

        {/* Renderiza o Modal na tela se o estado for verdadeiro */}
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
