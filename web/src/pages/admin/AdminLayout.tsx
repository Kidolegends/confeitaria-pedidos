import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useStore } from '../../lib/store';

const LINKS = [
  ['/admin', '📊', 'Dashboard'],
  ['/admin/pedidos', '🧾', 'Pedidos'],
  ['/admin/agenda', '📅', 'Agenda da semana'],
  ['/admin/produtos', '🎂', 'Produtos'],
  ['/admin/depoimentos', '💬', 'Depoimentos'],
  ['/admin/configuracoes', '⚙️', 'Configurações'],
  ['/admin/conta', '🔒', 'Minha conta'],
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { store } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {LINKS.map(([to, icon, label]) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/admin'}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-brand-700 text-white' : 'text-cream-100 hover:bg-white/10'}`
          }
        >
          <span aria-hidden>{icon}</span>
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-cream-50 lg:flex">
      <aside
        className={`${menuOpen ? 'block' : 'hidden'} bg-cocoa-900 p-4 lg:block lg:min-h-screen lg:w-60 lg:shrink-0`}
      >
        <div className="mb-6 hidden items-center gap-2 px-2 lg:flex">
          <span className="text-2xl">🧁</span>
          <span className="font-display font-bold text-white">Painel da loja</span>
        </div>
        {nav}
        <div className="mt-8 border-t border-white/10 px-3 pt-4 text-xs text-cream-200/70">
          <p className="truncate">{user?.email}</p>
          <div className="mt-2 flex gap-3">
            <a href="/" target="_blank" className="hover:text-white">
              Ver site ↗
            </a>
            <button onClick={logout} className="hover:text-white">
              Sair
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between bg-cocoa-900 px-4 py-3 lg:hidden">
          <span className="font-display font-bold text-white">🧁 Painel da loja</span>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-2xl text-white"
            aria-label="Menu"
          >
            ☰
          </button>
        </header>
        {store?.demo && (
          <p className="bg-brand-50 px-4 py-1.5 text-center text-xs text-brand-900">
            Modo demonstração: fique à vontade para testar. Os dados voltam ao original
            periodicamente.
          </p>
        )}
        <main className="mx-auto max-w-6xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-cocoa-900 md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-cocoa-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
