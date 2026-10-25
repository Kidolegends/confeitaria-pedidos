import { linkButtonClass } from '../../lib/buttons';
import { Link } from 'react-router-dom';
import {} from '../../components/ui';
import { SitePage } from './SiteLayout';

export function NotFoundPage() {
  return (
    <SitePage>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-6xl">🍰</p>
        <h1 className="mt-4 font-display text-3xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-cocoa-500">Parece que essa fatia já foi comida.</p>
        <Link to="/" className={linkButtonClass('primary', 'mt-6')}>
          Voltar para o início
        </Link>
      </div>
    </SitePage>
  );
}
