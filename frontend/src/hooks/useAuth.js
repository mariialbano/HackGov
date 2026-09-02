import { useContext } from 'react';
import { AuthContext } from '../context/contextoAuth';

// Acesso à sessão do usuário autenticado.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}
