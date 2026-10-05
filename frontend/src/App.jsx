import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

// Importando as Páginas
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import RecuperarSenha from './pages/RecuperarSenha';
import RedefinirSenha from './pages/RedefinirSenha';
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
import { useAuth } from './hooks/useAuth';

// Login, cadastro e recuperação de senha vêm antes da sessão: ali o chat
// e a avaliação disputariam atenção com o formulário.
const SEM_ATALHOS = ['/', '/cadastro', '/recuperar-senha', '/redefinir-senha'];

function AtalhosFlutuantes() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  // A rota também conta: o login espera um instante antes de ir para o
  // painel, e só a sessão faria os botões piscarem na tela de entrada.
  if (!isAuthenticated || SEM_ATALHOS.includes(pathname)) return null;

  // Desmontar, em vez de só esconder, zera a conversa ao sair da conta:
  // quem entrar em seguida no mesmo navegador não vê a anterior.
  return <ChatEAvaliacao />;
}

function ChatEAvaliacao() {
  // Estado para controlar a abertura do modal de estrelas
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <>
      {/* Injeta a função de abrir o feedback ao clicar na estrela verde do chatbot */}
      <ChatbotIA onOpenFeedback={() => setIsFeedbackOpen(true)} />

      {/* Renderiza o Modal na tela se o estado for verdadeiro */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota inicial: Tela de Login */}
          <Route path="/" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />

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

        {/* Chat e avaliação: somente depois do login */}
        <AtalhosFlutuantes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
