import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LogOut, Home, FileText, TrendingUp, Target, MapPin, BarChart3, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { name: 'Início', path: '/dashboard', icon: Home },
  { name: 'Protocolos', path: '/protocolos', icon: FileText },
  { name: 'Inflação', path: '/inflacao', icon: TrendingUp },
  { name: 'Metas', path: '/metas', icon: Target },
  { name: 'Indicadores', path: '/indicadores', icon: MapPin },
  // Item restrito: só aparece para o perfil atendente (controle de acesso)
  { name: 'Comparativo', path: '/comparativos', icon: BarChart3, perfis: ['atendente'] },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout(); // encerra a sessão (remove token do sessionStorage)
    navigate('/');
  };

  const itensVisiveis = navItems.filter(
    (item) => !item.perfis || (user && item.perfis.includes(user.perfil))
  );

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* LOGO ATUALIZADA: Agora é um Link interativo que aponta para o /dashboard */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 hover:opacity-85 transition-opacity outline-none"
        >
           <span className="text-xl font-bold text-gov-orange">HackGov VidaReal</span>
        </Link>

        {/* Links de Navegação */}
        <div className="flex items-center gap-2 md:gap-4">
          {itensVisiveis.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-gov-orange text-white shadow-sm'
                  : 'text-gray-600 hover:bg-orange-50 hover:text-gov-orange'}
              `}
            >
              <item.icon size={16} />
              <span className="hidden lg:inline">{item.name}</span>
            </NavLink>
          ))}

          {/* Usuário logado e seu perfil */}
          {user && (
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 border-l border-gray-200 pl-4 ml-2">
              <UserCircle2 size={18} className="text-gov-orange" />
              <span>
                {user.nome}
                <span className="text-xs text-gray-400 ml-1">({user.perfil})</span>
              </span>
            </div>
          )}

          {/* Botão de Sair */}
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-gray-50 transition-colors ml-2"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>
    </header>
  );
}
