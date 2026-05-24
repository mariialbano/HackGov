import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LogOut, Home, FileText, TrendingUp, Target, MapPin, BarChart3 } from 'lucide-react';

const navItems = [
  { name: 'Início', path: '/dashboard', icon: Home },
  { name: 'Protocolos', path: '/protocolos', icon: FileText },
  { name: 'Inflação', path: '/inflacao', icon: TrendingUp },
  { name: 'Metas', path: '/metas', icon: Target },
  { name: 'Indicadores', path: '/indicadores', icon: MapPin },
  { name: 'Comparativo', path: '/comparativos', icon: BarChart3 },
];

export default function Navbar() {
  const navigate = useNavigate();

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
          {navItems.map(item => (
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
          
          {/* Botão de Sair */}
          <button 
            onClick={() => navigate('/')}
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