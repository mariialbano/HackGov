import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LogOut, Home, FileText, TrendingUp, Target, MapPin, BarChart3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import VLibrasToggle from './VLibrasToggle';

const navItems = [
  { name: 'Início', path: '/dashboard', icon: Home },
  { name: 'Protocolos', path: '/protocolos', icon: FileText },
  { name: 'Inflação', path: '/inflacao', icon: TrendingUp },
  { name: 'Metas', path: '/metas', icon: Target },
  { name: 'Indicadores', path: '/indicadores', icon: MapPin },
  // Item restrito: só aparece para o perfil atendente (controle de acesso)
  { name: 'Comparativo', path: '/comparativos', icon: BarChart3, perfis: ['atendente'] },
];

function Iniciais({ nome }) {
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();

  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink ring-1 ring-brand-line"
      aria-hidden="true"
    >
      {iniciais}
    </span>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout(); // encerra a sessão (remove o token e invalida no servidor)
    navigate('/');
  };

  const itensVisiveis = navItems.filter(
    (item) => !item.perfis || (user && item.perfis.includes(user.perfil))
  );

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-surface/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-80"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-display text-sm font-bold text-on-brand shadow-raised">
            VR
          </span>
          <span className="hidden font-display text-[0.95rem] font-bold tracking-tight text-ink-900 sm:block">
            Vida<span className="text-brand-ink">Real</span>
          </span>
        </Link>

        {/* Navegação principal */}
        <div className="ml-auto flex items-center gap-0.5">
          {itensVisiveis.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.name}
              className={({ isActive }) =>
                [
                  'relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors lg:px-3',
                  isActive
                    ? 'text-brand-ink'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} aria-hidden="true" />
                  {/* sr-only em vez de hidden: o rótulo some visualmente
                      nas telas estreitas, mas continua disponível para
                      leitores de tela */}
                  <span className="sr-only lg:not-sr-only">{item.name}</span>
                  {/* Sublinhado da rota ativa: âncora estável entre as telas */}
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-brand" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Aparência, identificação do usuário e saída */}
        <div className="ml-2 flex items-center gap-1 border-l border-ink-200 pl-2">
          <VLibrasToggle />
          <ThemeToggle />
        </div>

        {user && (
          <div className="flex items-center gap-3 border-l border-ink-200 pl-3">
            <Link
              to="/perfil"
              title="Seu perfil"
              className="hidden items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-ink-100 md:flex"
            >
              <Iniciais nome={user.nome} />
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-ink-900">{user.nome}</span>
                <span className="block text-xs capitalize text-ink-500">{user.perfil}</span>
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-danger-soft hover:text-danger"
              title="Sair da conta"
            >
              <LogOut size={18} aria-hidden="true" />
              <span className="sr-only">Sair</span>
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
