import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

// Controle de acesso (Segurança da Informação)
// 1. Sem sessão ativa -> redireciona para o login.
// 2. Com sessão, mas sem o perfil exigido -> tela de acesso negado
//    (princípio do menor privilégio: cada perfil só vê o que precisa).

export default function ProtectedRoute({ children, perfis }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (perfis && !perfis.includes(user.perfil)) {
    return (
      <div className="min-h-screen bg-gov-bg">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-16 flex flex-col items-center text-center">
          <div className="bg-white p-10 rounded-xl shadow-lg border border-gray-100 max-w-md">
            <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso restrito</h1>
            <p className="text-gray-500">
              Esta área é exclusiva para o perfil{' '}
              <span className="font-semibold">{perfis.join(', ')}</span>. Seu perfil
              atual é <span className="font-semibold">{user.perfil}</span>.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return children;
}
