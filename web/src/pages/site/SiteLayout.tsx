import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';

const NAV = [
  ['#cardapio', 'Cardápio'],
  ['#como-pedir', 'Como pedir'],
  ['#depoimentos', 'Depoimentos'],
  ['#contato', 'Contato'],
];

export function SiteHeader() {
  const { store } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-cocoa-500/10 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-xl">
            🧁
          </span>
          <span className="font-display text-lg font-bold leading-tight text-cocoa-900">
            {store?.storeName ?? 'Doce Encanto'}
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-cocoa-700 md:flex">
          {NAV.map(([href, label]) => (
            <a key={href} href={`/${href}`} className="hover:text-brand-700">
              {label}
            </a>
          ))}
          <a
            href="/#pedido"
            className="rounded-full bg-brand-700 px-4 py-2 text-white shadow-sm hover:bg-brand-800"
          >
            Fazer pedido
          </a>
        </nav>
        <button
          className="rounded-lg p-2 text-2xl md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          ☰
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-cocoa-500/10 px-4 py-3 md:hidden">
          {[...NAV, ['#pedido', 'Fazer pedido']].map(([href, label]) => (
            <a
              key={href}
              href={`/${href}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 font-medium hover:bg-cream-100"
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { store } = useStore();
  return (
    <footer className="bg-cocoa-900 text-cream-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {store?.storeName ?? 'Doce Encanto Confeitaria'} ·{' '}
          {store?.city}
        </p>
        <div className="flex gap-4">
          {store?.instagram && (
            <a
              className="hover:text-white"
              href={`https://instagram.com/${store.instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
            >
              Instagram {store.instagram}
            </a>
          )}
          <Link to="/admin" className="text-cream-200/70 hover:text-white">
            Área da loja
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
